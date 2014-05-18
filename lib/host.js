// this runs on all vikings with an etcd client to listen for events
var etcdjs = require('etcdjs')
var config = require('./config')()
var utils = require('component-consoler');
var HostMonitor = require('./hostmonitor')

module.exports = function(etcdhosts){
	var etcd = etcdjs(etcdhosts)

	var vikingHostname = config.network.hostname

	var hostMonitor = HostMonitor(config, etcd)

	var leaderRunning = false

	// this will be trigged in another viking master if the etcd leadership changes
	function runLeader(){
		if(leaderRunning) return
		utils.log('leader', 'starting')
		leaderRunning = true

		hostMonitor.leader(function(){
			// the leader module has all the servies like registry and git push
			var leader = require('./leader')(config, etcd)
			leader.start(function(err){
				if(err){
					console.error('ERROR STARTING LEADER ' + err)
					return
				}
				
				utils.log('leader', 'running')
			})
		})
	}

	function runSlave(){
		var slave = require('./slave')(config, etcd)
		slave.start(function(err){
			if(err){
				utils.error('ERROR STARTING SLAVE ' + err)
				return
			}
			
			utils.log('slave', 'running')
		})
	}

	function masterLoop(){
		etcd.stats.leader(function(err, stats){
			if(err){
				//utils.error(err)
				setTimeout(masterLoop, 200)
				return
			}
			if(!stats){
				utils.error('no stats were returned from the etcd server')
				setTimeout(masterLoop, 200)
				return
			}
			
			if(stats.leader==vikingHostname){
				runLeader()
			}
			setTimeout(masterLoop, 2000)
		})
	}

	setTimeout(function(){

		hostMonitor.start(function(){
			utils.log('host monitor', 'running')
		})

		setTimeout(function(){
			
			if(config.master){
				masterLoop()	
			}

			runSlave()

		}, 500)
	}, 500)
	
}
