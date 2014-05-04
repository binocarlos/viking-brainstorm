// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var Container = require('./container')
var Deployment = require('./deployment')
var Docker = require('./docker')
var Job = require('./job')
var tools = require('./tools')

module.exports = function(config, etcd){

	
	var hostname = config.network.hostname
	var docker = Docker()

	var sink = new EventEmitter()
	var deployment = Deployment(config, etcd)

	var flattenResult = tools.flattenResult

	function runJob(job, done){

		var jobObject = Job(job)
		job.dockerName = job.name + '-' + job.id

		deployment.canRunJob(job, hostname, function(err, canRun){
			if(!canRun){
				return done('job failed')
			}

			var container = Container(job, config)

			container.start(function(err, data){

				deployment.writeContainer({
					hostname:hostname,
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


		console.log('-------------------------------------------');
		console.log('sink check deployment')

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
				docker.listContainers(function(err, containers){
					var containerNames = {}
					containers.forEach(function(c){
						c.Names.forEach(function(n){
							containerNames[n.replace(/^\//, '')] = c	
						})
					})
					next(err, containerNames)
				})
			}
		}, function(err, data){

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
						var container = docker.getContainer(containerName)
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
				finishDeployment()
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

			checkDeployment()
			return next(onDeploy)
		})
	}

	function listenDestroy(){

		etcd.wait('/destroy/' + hostname, {
			recursive:true
		}, function onDeploy(err, data, next){
			if(!data){
				return next(onDeploy)
			}
			
			checkDeployment()
			return next(onDeploy)
		})
	}


	sink.start = function(done){

		checkDeployment()
		listenDeploy()
		listenDestroy()

		setInterval(checkDeployment, 5000)
		
		done()
		
	}

	return sink
}