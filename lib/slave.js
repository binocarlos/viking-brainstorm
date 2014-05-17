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

	var flattenResult = tools.flattenResult

	/*
	
		THIS IS WHERE CONTAINERS START
		
	*/
	function runJob(job, done){

		var jobObject = Job(job)
		job.dockerName = job.name + '-' + job.tag

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

	var isChecking = false
	var postCheck = false

	function checkDeployment(){

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

		async.parallel({
			deploy:function(next){
				etcd.get('/deploy/' + hostname, {
					recursive:true
				}, function(err, data){
					if(err || !data){
						return next(err)
					}
					next(null, flattenResult(data.node))
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
		}, function(err, data){

			function removeContainers(nextStep){
				async.forEach(Object.keys(data.docker || {}), function(containerName, nextContainer){
					
					if(!containerName.match(/\w/)) return nextContainer()

					var hit = false
					Object.keys(data.deploy || {}).forEach(function(key){
						var c = data.deploy[key]
						if(c==containerName){
							hit = true
						}
					})

					if(containerName=='core-etcd' || hit){
						return nextContainer()
					}

					console.log('-------------------------------------------');
					console.log('REMOVE CONTAINER')
					console.dir(containerName)

					var container = Container(containerName)

					container.stop(function(err){

						console.log('-------------------------------------------');
						console.log('-------------------------------------------');
						console.log('-------------------------------------------');
						console.log('STOPPED')

						if(err) return nextContainer(err)
						container.remove(nextContainer)
					})
					  
				}, nextStep)
			}

			function runContainers(nextStep){

				async.forEach(Object.keys(data.deploy || {}), function(deployPath, nextContainer){
					var containerName = data.deploy[deployPath]
					var containerPath = '/' + deployPath.split('/').slice(3).join('/')

					function processJob(){
						etcd.get('/proc' + containerPath, function(err, result){
							if(err){
								return nextContainer()
							}
							var job = JSON.parse(result.node.value)
							jobCount++
							runJob(job, function(){
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
						console.error(err)
					}
					nextStep()
				})

			}

			removeContainers(function(err){
				if(err){
					console.error(err)
				}
				runContainers(finishDeployment)
			})

		})
		
	}

	function listenDeploy(){

		etcd.wait('/deploy/' + hostname, {
			recursive:true
		}, function onDeploy(err, data, next){
			if(!data){
				return next(onDeploy)
			}

			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('DEPLPOY')

			checkDeployment()
			return next(onDeploy)
		})
	}

	sink.start = function(done){

		checkDeployment()
		listenDeploy()

		setInterval(checkDeployment, 50)
		
		done()
		
	}

	return sink
}