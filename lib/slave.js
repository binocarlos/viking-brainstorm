// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var exec = require('child_process').exec
var Container = require('./container')
var Deployment = require('./deployment')
var Job = require('./job')
var tools = require('./tools')

module.exports = function(config, etcd){

	
	var hostname = config.network.hostname
	var ip = config.network.private

	var sink = new EventEmitter()
	var deployment = Deployment(config, etcd)
	var systemContainers = {}

	var containerNameArray = config.system.containers || []

	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.dir(containerNameArray)
	
	containerNameArray.forEach(function(name){
		systemContainers[name] = true
	})


	var flattenResult = tools.flattenResult

	function runJob(job, done){

		var jobObject = Job(job)
		job.dockerName = job.tag + '-' + job.name

		deployment.canRunJob(job, hostname, function(err, canRun){
			if(!canRun){
				return done('job failed')
			}

			var container = Container(job, config)

			container.start(function(err, data){

				deployment.writeContainer({
					hostname:hostname,
					ip:ip,
					job:job,
					container:data
				}, done)
				
			})
		})

	}

	function getState(done){
		async.parallel({
			deploy:function(next){
				etcd.get('/deploy/' + hostname, {
					recursive:true
				}, function(err, data){
					if(err || !data){
						return next(err)
					}
					next(null, flattenResult(data.node) || {})
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


	// destroy the containers that are running but not in our deploy list
	function removeContainers(data, done){

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

	// run the containers that are in our deploy list but not running on docker
	function runContainers(data, done){

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
					runJob(jobData, function(){
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

	var isChecking = false
	var postCheck = false
	function processState(done){

		// this stuff handles never running a state allocation in parallel
		if(isChecking){
			postCheck = true
			return
		}

		isChecking = true
		var actionCount = 0

		function finishDeployment(){

			setTimeout(function(){
				isChecking = false
				if(actionCount>0){
					postCheck = true
				}
				if(postCheck){
					postCheck = false
					processState(done)
				}
				else{
					done && done()
				}
			}, 500)
			
		}


		getState(function(err, state){
			removeContainers(state, function(err, removeCount){
				if(err){
					utils.error(err)
				}
				if(removeCount){
					actionCount += removeCount
				}
				runContainers(state, function(err, addCount){
					if(err){
						utils.error(err)
					}
					if(addCount){
						actionCount += addCount
					}
					finishDeployment()
				})
			})
		})	
	}

	/*
	
		THIS IS WHERE CONTAINERS START
		
	*/
	

	sink.start = function(done){

		
		etcd.wait('/deploy/' + hostname, {
			recursive:true
		}, function onDeploy(err, data, next){

			if(!data){
				return next(onDeploy)
			}

			utils.log('deploy event', data.action + ' - ' + data.node.key)
			console.dir(data)

			processState()

			return next(onDeploy)
		})
		
		done()
		
	}

	return sink
}