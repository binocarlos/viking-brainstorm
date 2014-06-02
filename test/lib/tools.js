var spawn = require('child_process').spawn
var path = require('path')
var exec = require('child_process').exec
var async = require('async');
var etcdjs = require('etcdjs')
var flatten = require('etcd-flatten')
var tape     = require('tape')
var config = require('../../lib/config')()
var concat = require('concat-stream')
var spawnargs = require('spawn-args')
var state = {}

function runCommands(commands, done){

	async.forEachSeries(commands, function(command, nextCmd){

		var args = spawnargs(command)

		var cmd = args.shift()
		var p = spawn(cmd, args, {
			stdio:[null, process.stdout, process.stderr]
		})

		p.on('error', nextCmd)
		p.on('close', nextCmd)
	}, done)
}

function checkEtcds(tape){

	tape('etcd should be running on all viking servers', function(t){
		async.forEachSeries(['viking-0', 'viking-1', 'viking-2'], function(hostname, nextHost){

			exec('ssh ' + hostname + ' docker ps | grep etcd', function(err, stdout, stderr){
				if(err){
					t.fail(err)
					return nextHost()
				}
				if(stderr){
					t.fail(stderr.toString)
					return nextHost()
				}

				var match = stdout.toString().match(/etcd/)

				t.ok(match, 'etcd was found in the docker ps output')
				nextHost()
			})
		}, function(err){
			if(err){
				t.fail(err)
				return t.end()
			}

			t.pass('etcd was found in all servers')
			t.end()
		})
	})
}

function startStack(tape){

	tape('reset viking servers', function(t){

		var commands = [
			'ssh viking-0 /bin/bash -c "cd /srv/projects/viking && make clean"',
			'ssh viking-1 /bin/bash -c "cd /srv/projects/viking && make clean"',
			'ssh viking-2 /bin/bash -c "cd /srv/projects/viking && make clean"'
		]

		runCommands(commands, function(err){
			if(err){
				t.fail(err)
				return t.end()
			}

			t.pass('vikings reset')
			t.end()

		})

	})

	tape('start viking servers', function(t){

		var commands = [
			'ssh viking-0 viking start --seed',
			'sleep 2',
			'ssh viking-1 viking start',
			'sleep 2',
			'ssh viking-2 viking start'
		]

		runCommands(commands, function(err){
			if(err){
				t.fail(err)
				return t.end()
			}
			t.pass('the viking servers have started')
			t.end()
		})

	})
}

function stopStack(tape){

	tape('shutdown', function(t){

		var host = [
			'ssh viking-2 viking host stop --clean',
			'ssh viking-1 viking host stop --clean',
			'ssh viking-0 viking host stop --clean'
		]

		var etcd = [
			'ssh viking-2 viking etcd stop',
			'ssh viking-1 viking etcd stop',
			'sleep 2',
			'ssh viking-0 viking etcd stop'
		]

		runCommands(host, function(err){
			if(err){
				t.fail(err)
				return t.end()
			}

			t.pass('viking hosts stopped')
			runCommands(etcd, function(err){
				if(err){
					t.fail(err)
					return t.end()
				}

				t.pass('viking etcds stopped')
				t.end()
			})
		})
	})
}

function stack(){
	return {
		checkEtcds:checkEtcds,
		start:startStack,
		stop:stopStack
	}
}

function host(){
	return {
		start:function(tape){
			tape('viking host start', function(t){
				exec('viking host start -d', function(err, stdout){
					if(err){
						t.fail(err, 'viking host start failed')
						t.end()
						return
					}
					console.log(stdout.toString())
					t.pass('viking host running')
					t.end()
				})
			})
		},
		check:function(tape){
			tape('check host running', function(t){
				exec('viking info host', function(err, stdout, stderr){
					if(err || stderr){
						t.fail(stderr.toString())
						return t.end()
					}
					var content = stdout.toString()
					var data = JSON.parse(content)
					t.equal(data.host.state, 'alive', 'the host is alive')
					t.end()
				})
			})
		},
		stop:function(tape){
			tape('viking host stop', function(t){
				exec('viking host stop --clean', function(err){
					if(err){
						t.fail(err, 'viking host stop')
						t.end()
						return
					}
					t.pass('viking host stop')
					t.end()
				})
			})
		}
	}
}

function core(){
	return {
		deploy:function(tape){
			tape('deploy the core stack', function(t){
				exec('viking deploy core', function(err, stdout, stderr){
					if(err || stderr){
						t.fail(stderr.toString())
						return t.end()
					}
					t.pass('viking core deployed')
					t.end()
				})
			})
		},
		check:function(tape){

			tape('check registry running', function(t){

				exec('docker ps', function(err, stdout, stderr){
					if(err || stderr){
						t.fail(stderr.toString())
						return t.end()
					}

					var content = stdout.toString()
					// we should have a registry and etcd running
					t.ok(content.match(/core-default-registry/), 'registry running')

					t.end()
				})
					
			})

		}
	}
}
function etcd(){
	return {
		reset:function(tape){
			tape('reset etcd', function(t){
				exec('sudo viking etcd reset', function(err, stdout){
					if(err){
						t.fail(err, 'reset etcd')
						t.end()
						return
					}
					console.log(stdout.toString())
					t.end()
				})
			})
		},
		start:function(tape){
			tape('start etcd', function(t){
				exec('viking etcd start --seed', function(err, stdout){
					if(err){
						t.fail(err, 'start etcd')
						t.end()
						return
					}
					console.log(stdout.toString())
					t.pass('viking etcd running')
					t.end()
				})
			})
		},
		check:function(tape){
			// start viking - this will boot etcd and get the registry running
			tape('check etcd running', function(t){
				exec('docker ps', function(err, stdout, stderr){
					if(err || stderr){
						t.fail(stderr.toString(), 'check etcd running')
						return t.end()
					}
					var content = stdout.toString()
					t.ok(content.match(/core-etcd/), 'etcd running')
					t.end()
				})
			})
		},
		stop:function(tape){
			tape('stop etcd', function(t){
				exec('viking etcd stop', function(err){
					if(err){
						t.fail(err, 'viking etcd stop')
						t.end()
						return
					}
					
					t.pass('viking stopped')
					t.end()
				})
			})
		}
	}
}

function builder(){
	var state = {}
	return {
		build:function(etcd, tape, etcdaddress, registryaddress){

			tape('build a simple stack and commit to the registry', function(t){

				console.log('build stack...')

				var build = spawn('viking', [
					'build',
					'--etcd',
					etcdaddress
				], {
					stdio:'inherit',
					cwd:path.normalize(__dirname + '/../example')
				})

				build.on('error', function(e){
					t.fail(e.toString())
					return t.end()
				})

				build.on('close', function(){

					console.log('stack has been built and uploaded to the registry')

					setTimeout(function(){

						etcd.get('/images', {
							recursive:true
						}, function(err, result){
							if(err){
								t.fail(err.toString())
								return t.end()	
							}

							result = flatten(result.node)


							console.log('-------------------------------------------');
							console.log('-------------------------------------------');
							console.dir(result)
							

							state.testImage = result['/images/ragnar/default/inherit']

							console.log('-------------------------------------------');
							console.log('-------------------------------------------');
							console.dir(state.testImage)
							console.log('-------------------------------------------');
							console.dir(registryaddress)

							t.ok(state.testImage.indexOf(registryaddress || config.network.private)>=0, 'image name containes private hostname')

							t.end()
						})
					}, 2000)
				})

			})
		},

		pull:function(tape){

			tape('pull an image from the registry when docker run is used', function(t){

				console.log('run image' + state.testImage)

				if(!state.testImage){
					t.fail('has no test image name')
					return t.end()
				}

				var run = spawn('docker', [
					'run',
					'-t',
					'--rm',
					state.testImage,
					'echo',
					'/etc/mysetting'
				], {
					stdio:'inherit'
				})

				run.on('error', function(err){
					t.fail(e.toString())
					t.end()
				})
				run.on('close', function(){
					t.end()
				})


			})

		},

		checkpull:function(tape){


			tape('check the right image was pulled correctly', function(t){

				console.log('check image...')

				if(!state.testImage){
					t.fail('has no test image name')
					return t.end()
				}

				var run = spawn('docker', [
					'run',
					'-t',
					'--rm',
					state.testImage,
					'echo',
					'/etc/mysetting'
				])

				var pass = false

				run.stdout.on('data', function (data) {
					if(data.toString().match(/\/etc\/mysetting/)){
						pass = true
					}
				  console.log('stdout: ' + data);
				});

				run.stderr.on('data', function (data) {
				  console.log('stderr: ' + data);
				  t.fail(data.toString())
				});

				run.on('close', function (code) {
				  t.ok(pass, 'the output contained the value buried in the uploaded image')
				  t.end()
				});

			})
		}
	}
}

function pause(tape, len, message){
	tape(message || 'pausing for ' + len + ' seconds', function(t){
		setTimeout(function(){
			t.end()
		}, len * 1000)
	})
}

module.exports = {
	stack:stack,
	pause:pause,
	builder:builder,
	etcd:etcd,
	core:core,
	host:host,
	checkEtcds:checkEtcds,
	runCommands:runCommands
}