// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var exec = require('child_process').exec
var Job = require('../tools/job')
var Container = require('../tools/container')
var tools = require('../tools')
var flatten = require('etcd-flatten')
var Schedule = require('./schedule')

module.exports = function(config, etcd){

	var hostname = config.network.hostname
	var systemContainers = {}

	var schedule = Schedule(config, etcd)

	var containerNameArray = config.system.containers || []

	containerNameArray.forEach(function(name){
		systemContainers[name] = true
	})

	function canRunJobCounter(job, hostname, done){
		var self = this;
		if(job.system){
			return done(null, true)
		}
		var jobObject = Job(job)
		etcd.get('/counter/' + hostname + jobObject.key(), function(err, data){
			var counter = 0
			if(!err && data){
				counter = parseInt(data.node.value)
			}
			if(isNaN(counter)){
				counter = 0
			}
			counter++
			etcd.set('/counter/' + hostname + jobObject.key(), counter, function(err){
				if(counter>5){
					schedule.removeJob({
						job:job,
						hostname:hostname,
						removeProc:true,
						failed:true
					}, function(){
						done(null, false)
					})
				}
				else{
					done(null, true)
				}
			})
		})
	}

	function writeContainer(opts, done){
		var self = this
		var job = opts.job
		var ip = opts.ip
		var container = opts.container

		var jobObject = Job(job)

		async.parallel([
			function(next){

				schedule.writeDockerEndpoint({
					ip:ip,
					container:container,
					job:job
				}, next)
				
			},

			function(next){
				etcd.set('/deploy/' + hostname + jobObject.key(), jobObject.containerName(), job.id, next)
			},

			function(next){
				etcd.set('/container/' + hostname + jobObject.key(), JSON.stringify(container), next)
			}
		], done)
	}

	function processSlave(done){
		var self = this;
		getSlaveState(function(err, state){
			var actionCount = 0
			removeSlaveContainers(state, function(err, removeCount){
				if(err){
					utils.error(err)
				}
				if(removeCount){
					actionCount += removeCount
				}
				runSlaveContainers(state, function(err, addCount){
					if(err){
						utils.error(err)
					}
					if(addCount){
						actionCount += addCount
					}
					done(err, actionCount)
				})
			})
		})
	}

	function getSlaveState(done){
		var self = this;
		async.parallel({
			deploy:function(next){
				etcd.get('/deploy/' + hostname, {
					recursive:true
				}, function(err, data){
					if(err || !data){
						return next(err)
					}
					var ret = {}
					var deps = flatten(data.node) || {}

					Object.keys(deps || {}).forEach(function(key){
						var val = deps[key]
						key = key.substr('/deploy/' + hostname)
						ret[key] = val
					})
					next(null, ret)
				})
			},
			docker:function(next){

				exec('docker ps', function(err, stdout, stderr){
					if(err) return next(err)
						
					var lines = (stdout.toString() || '').split(/\n/).filter(function(l){
						return l.match(/\w/)
					})

					var names = lines.map(function(line){
						var parts = line.split(/\s\s+/)
						return parts[6]
					}).filter(function(n){
						return n!='NAMES'
					})

					var ret = {}

					names.forEach(function(n){
						ret[n] = true
					})

					next(err, ret)
				})
			}
		}, done)
	}

	function slaveRunJob(job, done){
		var self = this;
		var jobObject = Job(job)

		self.canRunJobCounter(job, hostname, function(err, canRun){
			if(!canRun){
				return done('job failed')
			}

			var container = Container(job, config)

			console.log('start job')
			console.log(JSON.stringify(job, null, 4))

			container.prepare(config, function(err){
				container.start(function(err, data){

					self.writeContainer({
						hostname:hostname,
						ip:config.network.private,
						job:job,
						container:data
					}, done)
					
				})
			})
			
		})

	}

	function runSlaveContainers(data, done){
		var self = this;
		var jobCount = 0
		async.forEach(Object.keys(data.deploy || {}), function(deployPath, nextContainer){
			var containerName = data.deploy[deployPath]
			var containerPath = deployPath

			function processJob(){

				var nameParts = tools.jobNameParts(containerPath)

				self.loadJobByPath(containerPath, function(err, jobData){
					if(err || !jobData){
						return nextContainer()
					}
					jobCount++
					self.slaveRunJob(jobData, function(){
						nextContainer()	
					})
				})
			}

			if(containerName){
				// our container is not running remove it!
				if(!data.docker[containerName]){
					var container = Container(containerName)
					container.remove(function(){
						processJob()
					})
				}
				// our container is running - all is good
				else{
					nextContainer()
				}
			}
			// start the container normally
			else{
				processJob()
			}
			
		}, function(err){
			done(err, jobCount)
		})

	}

	function removeSlaveContainers(data, done){
		var count = 0
		async.forEach(Object.keys(data.docker || {}), function(containerName, nextContainer){
			
			if(!containerName.match(/\w/)) return nextContainer()

			var hit = false
			Object.keys(data.deploy || {}).forEach(function(key){
				var c = data.deploy[key]
				if(c==containerName){
					hit = true
				}
			})

			// we dont want to remove etcd
			if(systemContainers[containerName] || hit){
				return nextContainer()
			}

			utils.log('remove', containerName)
			console.dir(data)

			count++

			var container = Container(containerName)

			container.stop(function(err){
				if(err) return nextContainer(err)
				container.remove(nextContainer)
			})
			  
		}, function(err){
			done(err, count)
		})
	}

	return {
		canRunJobCounter:canRunJobCounter,
		writeContainer:writeContainer,
		processSlave:processSlave,
		getSlaveState:getSlaveState,
		slaveRunJob:slaveRunJob,
		runSlaveContainers:runSlaveContainers,
		removeSlaveContainers:removeSlaveContainers
	}
}