// this runs on all vikings with an etcd client to listen for events
var etcdjs = require('etcdjs')
var Config = require('../config')()
var spawn = require('child_process').spawn
var path = require('path')
var Slave = require('../slave')
var Leader = require('../leader')

module.exports = function(opts){

	var etcdhosts = config.network.etcd || '127.0.0.1:4001'
	var etcd = etcdjs(etcdhosts)
	var vikingHostname = config.network.hostname

	// this means the leadership can be lost and then regained by the same server with no effect
	var leaderRunning = false
	
	function runSlave(){
		var slave = Slave(config, etcd)
		slave.start(function(err){
			if(err){
				utils.error('ERROR STARTING SLAVE ' + err)
				return
			}
			utils.log('slave', 'running')
		})
	}

	function runMaster(){
		var leader = Leader(config, etcd)
		leader.listen(function(err){
			if(err){
				utils.error('ERROR STARTING MASTER ' + err)
				return
			}
			utils.log('master', 'running')
		})
	}

	function runHost(){

		if(config.master){
			runMaster()
		}

		if(config.slave){
			runSlave()
		}
	}

	runHost()
}
