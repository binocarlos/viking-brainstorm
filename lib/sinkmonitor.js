// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var Container = require('./container')
var Docker = require('./docker')


module.exports = function(config, etcd){

	var hostname = config.network.hostname
	var docker = Docker()

	var monitor = new EventEmitter()

	function flattenResult(node){
		var ret = {}
		function flatten(d){
			if(d.dir){
				d.nodes.forEach(flatten)
			}
			else{
				ret[d.key] = d.value
			}	
		}
		flatten(node)
		return ret
	}

	function runJob(job, done){

		job._name = job.name
		job.name = job.stack + '-' + job.name + '-' + job.id

		var container = Container(job, config)

		container.start(function(err, data){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('CONTAINER STARTED!!!')
			console.dir(err)
			console.dir(data)
			process.exit()
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

		function finishDeployment(){

			setTimeout(function(){
				isChecking = false
				if(postCheck){
					postCheck = false
					checkDeployment()
				}
			}, 500)
			
		}

		async.parallel({
			deploy:function(next){
				etcd.get('/deploy/' + config.network.hostname, {
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
					var containerIds = {}
					containers.forEach(function(c){
						containerIds[c.Id] = c
					})
					next(err, containerIds)
				})
			}
		}, function(err, data){

			async.forEach(Object.keys(data.deploy || {}), function(deployPath, nextContainer){
				var containerId = data.deploy[deployPath]
				var containerPath = '/' + deployPath.split('/').slice(3).join('/')

				function processJob(){
					etcd.get('/proc' + containerPath, function(err, result){
						if(err){
							return nextContainer()
						}
						var job = JSON.parse(result.node.value)
						runJob(job, function(){
							nextContainer()	
						})
					})
				}

				if(containerId){
					// our container is not running remove it!
					if(!data.docker[containerId]){
						var container = docker.getContainer(containerId)
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

		etcd.wait('/deploy/' + config.network.hostname, {
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

		etcd.wait('/destroy/' + config.network.hostname, {
			recursive:true
		}, function onDeploy(err, data, next){
			if(!data){
				return next(onDeploy)
			}
			
			checkDeployment()
			return next(onDeploy)
		})
	}


	monitor.start = function(done){

		checkDeployment()
		listenDeploy()
		listenDestroy()

		setInterval(checkDeployment, 5000)
		
		done()
		
	}

	return monitor
}