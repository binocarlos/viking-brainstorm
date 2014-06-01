// this runs on all vikings with an etcd client to listen for events
var etcdjs = require('etcdjs')
var Config = require('../config')
var utils = require('component-consoler');
var spawn = require('child_process').spawn
var path = require('path')
var Tail = require('tail').Tail;

module.exports = function(opts){

	var config = Config(opts)
	var etcdhosts = config.network.etcd || '127.0.0.1:4001'
	var etcd = etcdjs(etcdhosts)

	var vikingHostname = config.network.hostname

	// this means the leadership can be lost and then regained by the same server with no effect
	var leaderRunning = false
	
	function runSlave(){
		var slave = require('../slave')(config, etcd)
		slave.start(function(err){
			if(err){
				utils.error('ERROR STARTING SLAVE ' + err)
				return
			}
			utils.log('slave', 'running')
		})
	}

	function runMaster(){
		var leader = require('../leader')(config, etcd)
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
		// stop and remove all jobs that are running on this host
		clean:function(done){
			var clean = spawn('viking', ['local', 'clean'], {
				stdio:'inherit'
			})

			clean.on('close', done)
			clean.on('error', done)
		},
		stop:function(done){
			var stop = spawn('mongroup', ['stop'], {
				stdio:'inherit',
				cwd:path.normalize(__dirname + '/../..')
			})

			stop.on('close', done)
			stop.on('error', done)
		},
		status:function(){
			spawn('mongroup', ['status', '--json'], {
				stdio:'inherit',
				cwd:path.normalize(__dirname + '/../..')
			})
		},
		deamonize:function(done){
			var mon = spawn('mongroup', ['start'], {
				stdio:'inherit',
				cwd:path.normalize(__dirname + '/../..')
			})

			mon.on('close', done)
			mon.on('error', done)
		},
		tail:function(){
			var tail = new Tail("/var/log/viking/host.log");

			tail.on("line", function(data) {
			  console.log(data);
			})
		},
		boot:function(){
			var cmd = opts._[3] || 'start'
			if(cmd=='start'){
				if(opts.deamon){
					host.deamonize(function(){
						if(opts.tail){
							
						}
					})
				}
				else{
					host.start()	
				}
			}
			else if(cmd=='stop'){
				host.stop(function(){
					if(opts.clean){
						host.clean(function(){
							
						})
					}
				})
			}
			else if(cmd=='clean'){
				host.clean(function(){
					
				})
			}
			else if(cmd=='tail'){
				host.tail()
			}
			else if(cmd=='status'){
				host.status()
			}
			else{
				console.error('no command found: ' + cmd)
			}
		}
	}

	return host	
}
