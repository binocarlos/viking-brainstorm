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
	var state = State(config, deployment, etcd)
	var systemContainers = config.system.containers || {}

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

			var container = Container(containerName)

			container.stop(function(err){
				if(err) return nextContainer(err)
				container.remove(nextContainer)
			})
			  
		}, done)
	}

	// run the containers that are in our deploy list but not running on docker
	function runContainers(data, done){

		async.forEach(Object.keys(data.deploy || {}), function(deployPath, nextContainer){
			var containerName = data.deploy[deployPath]
			var containerPath = '/' + deployPath.split('/').slice(3).join('/')

			function processJob(){

				var nameParts = tools.jobNameParts(containerpath)

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
			if(err){
				utils.error(err)
			}
			nextStep()
		})

	}

	var isChecking = false
	var postCheck = false
	function checkDeployment(){

		// this stuff handles never running a state allocation in parallel
		if(isChecking){
			postCheck = true
			return
		}

		isChecking = true
		var jobCount = 0

		function finishDeployment(){

			setTimeout(function(){
				isChecking = false
				if(jobCount>0){
					postCheck = true
				}
				if(postCheck){
					postCheck = false
					checkDeployment()
				}
			}, 500)
			
		}


		getState(hostname, etcd, function(err, state){
			removeContainers(state, function(err){
				if(err){
					utils.error(err)
				}
				runContainers(state, finishDeployment)
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

			utils.log('deploy event')
			console.dir(data)

			state()
			return next(onDeploy)
		})
		
		done()
		
	}

	return sink
}