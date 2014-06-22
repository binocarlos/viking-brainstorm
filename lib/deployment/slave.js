var async = require('async')
var exec = require('child_process').exec
var Job = require('../tools/job')
var Container = require('../tools/container')
var tools = require('../tools')
var flatten = require('etcd-flatten')
var Schedule = require('./schedule')
var logger = require('../tools/logger')
var Log = require('./log')
var Endpoints = require('./endpoints')
var hyperquest = require('hyperquest')

module.exports = function(config, etcd){

	var hostname = config.network.hostname
	var systemContainers = {}

	var schedule = Schedule(config, etcd)
	var log = Log(config, etcd)

	var containerNameArray = config.system.containers || []

	containerNameArray.forEach(function(name){
		systemContainers[name] = true
	})

	// where are we directing the output of the container
	function loadStreamTarget(etcd, job, done){
		if(job.streamTarget){
			return done(null, job.streamTarget)
		}
		else{
			Endpoints.feedback(etcd, done)
		}
	}

	function slaveRunJob(job, done){
		var jobObject = Job(job)

		var container = Container(job, config)

		var containerData = null

		logger('[slave run job] [json] ' + JSON.stringify(job))

		// the stream is the stdout and stderr from docker run
		container.on('stream', function(stream){
			if(!job.feedbackTarget){
				logger.error('[no feedback target]')
				return
			}

			var req = hyperquest(job.feedbackTarget, {
				method:'POST'
			})

			stream.pipe(req).pipe(process.stdout)
			stream.pipe(process.stdout)
		})

		async.series([

		  function(next){
		  	container.start(function(err, data){

		  		containerData = data
		  		next(err)
		  		
				})
		  },

		  function(next){

				writeContainer({
					hostname:hostname,
					ip:config.network.private,
					job:job,
					container:containerData
				}, next)
		  }
		], function(err){
			if(err){
				log.failContainer(job, done)
			}
			else{
				log.runContainer(job, done)
			}
		})
			
	}


	// AFTER the job is running - we write the container details
	function writeContainer(opts, done){
		var job = opts.job
		var ip = opts.ip
		var container = opts.container

		var jobObject = Job(job)

		var record = {
			ip:ip,
			container:container,
			endpoints:[],
			job:job
		}

		async.parallel([
			function(next){

				schedule.writeDockerEndpoint({
					ip:ip,
					container:container,
					job:job
				}, function(err, endpointArray){
					if(err) return next(err)

					record.endpoints = record.endpoints.concat(endpointArray)

					etcd.set('/container' + jobObject.key(), JSON.stringify(record), next)

				})
				
			},

			function(next){
				etcd.set('/deploy/' + hostname + jobObject.key(), job.id, next)
			},

			function(next){

				
				logger('[slave write container] ' + job.id + ' [json] ' + JSON.stringify(record))

				next()

				
			}
		], done)
	}

	function processSlave(done){
		//logger('[process slave] ' + config.network.hostname)
		getSlaveState(function(err, state){
			var actionCount = 0
			removeSlaveContainers(state, function(err, removeCount){
				if(err){
					logger.error(err)
				}
				if(removeCount){
					actionCount += removeCount
				}
				runSlaveContainers(state, function(err, addCount){
					if(err){
						logger.error(err)
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
						key = key.replace('/deploy/' + hostname, '')
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


	// run all containers in the state for this host
	// check docker for those already running
	function runSlaveContainers(data, done){
		var jobCount = 0

		async.forEach(Object.keys(data.deploy || {}), function(deployPath, nextContainer){
			var containerName = data.deploy[deployPath]
			var containerPath = deployPath

			function processJob(){

				logger('[process job] ' + containerPath)

				var nameParts = tools.jobNameParts(containerPath)

				// load the actual job from /proc
				schedule.loadJobByPath(containerPath, function(err, jobData){
					if(err || !jobData){
						logger.error(containerPath + ': ' + err || 'no data')
						return nextContainer()
					}
					jobCount++

					slaveRunJob(jobData, function(){
						nextContainer()	
					})
				})
			}

			if(containerName){
				// our container is not running remove it!
				if(!data.docker[containerName]){
					var container = Container(containerName)

					container.remove(function(){
						log.removeContainer(containerName, function(){
							processJob()
						})
						
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

	// cleanup when a docker container is running locally but is not in the state
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

			logger('[remove container] ' + containerName + ' [json] ' + JSON.stringify(data))
			
			count++

			var container = Container(containerName)

			container.stop(function(err){
				if(err) return nextContainer(err)
				container.remove(function(){
					log.removeContainer(containerName, nextContainer)
				})
			})
			  
		}, function(err){
			done(err, count)
		})
	}

	return {
		writeContainer:writeContainer,
		processSlave:processSlave,
		getSlaveState:getSlaveState,
		slaveRunJob:slaveRunJob,
		runSlaveContainers:runSlaveContainers,
		removeSlaveContainers:removeSlaveContainers
	}
}