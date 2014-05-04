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

	function masterLoop(){
		etcd.stats.self(function(err, stats){
			if(err){
				throw err
			}
			if(stats.leaderInfo.leader==vikingHostname){
				runLeader()
			}
			setTimeout(masterLoop, 5000)
		})
	}

	function slaveLoop(){
		
	}

	setTimeout(function(){

		hostMonitor.start(function(){
			utils.log('host monitor', 'running')
		})

		setTimeout(function(){
			
			if(config.master){
				masterLoop()	
			}

			if(config.slave){
				slaveLoop()
			}
		}, 500)
	}, 500)
	
}
