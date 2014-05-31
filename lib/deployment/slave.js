// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Job = require('../tools/job')
var Container = require('../tools/container')
var tools = require('../tools')
var flatten = require('etcd-flatten')

module.exports = function(config, etcd){

	var hostname = config.network.hostname
	var systemContainers = {}

	var containerNameArray = config.system.containers || []

	containerNameArray.forEach(function(name){
		systemContainers[name] = true
	})

	
	return {

		processSlave:function processSlave(done){
			var self = this;

			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('PROCESS SLAVE')
			self.getSlaveState(function(err, state){

				console.log('-------------------------------------------');
				console.log('state')
				console.dir(state)
				self.removeSlaveContainers(state, function(err, removeCount){
					if(err){
						utils.error(err)
					}
					if(removeCount){
						actionCount += removeCount
					}
					self.runSlaveContainers(state, function(err, addCount){
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
		},

		getSlaveState:function getSlaveState(done){
			async.parallel({
				deploy:function(next){
					etcd.get('/deploy/' + hostname, {
						recursive:true
					}, function(err, data){
						if(err || !data){
							return next(err)
						}
						next(null, flatten(data.node) || {})
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
		},

		slaveRunJob:function slaveRunJob(job, done){
			var self = this;
			var jobObject = Job(job)
			job.dockerName = job.tag + '-' + job.name

			self.canRunJobCounter(job, hostname, function(err, canRun){
				if(!canRun){
					return done('job failed')
				}

				var container = Container(job, config)

				container.start(function(err, data){

					self.writeContainer({
						hostname:hostname,
						ip:ip,
						job:job,
						container:data
					}, done)
					
				})
			})

		},

		// run the containers that are in our deploy list but not running on docker
		runSlaveContainers:function runSlaveContainers(data, done){
			var self = this;
			var jobCount = 0
			async.forEach(Object.keys(data.deploy || {}), function(deployPath, nextContainer){
				var containerName = data.deploy[deployPath]
				var containerPath = '/' + deployPath.split('/').slice(3).join('/')

				function processJob(){

					var nameParts = tools.jobNameParts(containerPath)

					console.log('-------------------------------------------');
					console.log('-------------------------------------------');
					console.log('-------------------------------------------');
					console.log('NAME PARTS')
					console.dir(nameParts)

					deployment.loadJob(nameParts.stack, nameParts.tag, nameParts.name, function(err, jobData){
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

		},

		// destroy the containers that are running but not in our deploy list
		removeSlaveContainers:function removeSlaveContainers(data, done){
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
	}
}