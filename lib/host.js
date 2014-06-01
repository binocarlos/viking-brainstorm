// this runs on all vikings with an etcd client to listen for events
var etcdjs = require('etcdjs')
var Config = require('./config')
var utils = require('component-consoler');
var spawn = require('child_process').spawn
var path = require('path')

module.exports = function(opts){

	var config = Config(opts)
	var etcdhosts = config.network.etcd || '127.0.0.1:4001'
	var etcd = etcdjs(etcdhosts)

	var vikingHostname = config.network.hostname

	// this means the leadership can be lost and then regained by the same server with no effect
	var leaderRunning = false
	
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

	function runMaster(){
		var leader = require('./leader')(config, etcd)
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

	var host = {
		start:function(){
			setTimeout(runHost, 500)		
		},
		stop:function(){
			spawn('mongroup', ['stop'], {
				stdio:'inherit',
				cwd:path.normalize(__dirname + '/..')
			})
		},
		deamonize:function(){
			spawn('mongroup', ['start'], {
				stdio:'inherit',
				cwd:path.normalize(__dirname + '/..')
			})
		},
		boot:function(){
			var cmd = opts._[3] || 'start'
			if(cmd=='start'){
				if(opts.deamon){
					host.deamonize()
				}
				else{
					host.start()	
				}
			}
			else if(cmd=='stop'){
				host.stop()
			}
			else{
				console.error('no command found: ' + cmd)
			}
		}
	}

	return host	
}
