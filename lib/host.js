// this runs on all vikings with an etcd client to listen for events
var etcdjs = require('etcdjs')
var Config = require('./config')
var utils = require('component-consoler');

module.exports = function(opts){

	var config = Config(opts)
	var etcdhosts = config.network.etcd || '127.0.0.1:4001'
	var etcd = etcdjs(etcdhosts)

	var vikingHostname = config.network.hostname

	// this means the leadership can be lost and then regained by the same server with no effect
	var leaderRunning = false
	
	function runSlave(){
		var SlaveMonitor = require('./tools/slavemonitor')
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
			//utils.log('host update', vikingHostname)
		})

		slaveMonitor.create(function(){
			slaveMonitor.start()
		})
	}

	function runMaster(){
		var leader = require('./leader')(config, etcd)
		var LeaderMonitor = require('./tools/leadermonitor')
		var leaderMonitor = LeaderMonitor(etcd, config)
		leaderMonitor.on('select', function(){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('leader elected')
			console.log(vikingHostname)

			leader.start(function(err){
				if(err){
					console.error('ERROR STARTING LEADER ' + err)
					return
				}
				
				utils.log('leader', 'running')
			})
		})

		leaderMonitor.on('deselect', function(){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('leader unelected')
			console.log(vikingHostname)

			leader.stop(function(err){
				if(err){
					console.error('ERROR STOPPING LEADER ' + err)
					return
				}
				
				utils.log('leader', 'stopped')
			})
		})

		leaderMonitor.start()
		leader.listen()

	}

	function runHost(){

		if(config.master){
			utils.log('viking master', 'starting')
			runMaster()
		}

		if(config.slave){
			utils.log('viking slave', 'starting')
			runSlave()
		}
	}

	setTimeout(runHost, 500)
	
}
