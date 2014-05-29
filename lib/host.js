// this runs on all vikings with an etcd client to listen for events
var etcdjs = require('etcdjs')
var config = require('./config')()
var utils = require('component-consoler');
var SlaveMonitor = require('./tools/slavemonitor')
var LeaderMonitor = require('./tools/leadermonitor')

module.exports = function(){

	var etcdhosts = config.network.etcd || '127.0.0.1:4001'
	var etcd = etcdjs(etcdhosts)

	var vikingHostname = config.network.hostname

	// this means the leadership can be lost and then regained by the same server with no effect
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
		var slaveMonitor = SlaveMonitor(etcd, config)
		var slave = require('./slave')(config, etcd)

		slave.start(function(err){
			if(err){
				utils.error('ERROR STARTING SLAVE ' + err)
				return
			}
			
			utils.log('slave', 'running')
		})

		slaveMonitor.on('update', function(data){
			console.dir(data)
		})

		slaveMonitor.start()
	}

	function masterLoop(){
		var leaderMonitor = LeaderMonitor(etcd, config)

		leaderMonitor.on('elect', function(){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('leader elected')
			console.log(vikingHostname)
		})

	}

	function runHost(){
		if(config.master){
			utils.log('viking master', 'starting')
			masterLoop()
		}

		if(config.slave){
			utils.log('viking slave', 'starting')
			runSlave()
		}
	}

	setTimeout(runHost, 500)
	
}
