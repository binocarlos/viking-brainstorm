// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var Job = require('./job')
var Server = require('./server')
var tools = require('./tools')
var flatten = require('etcd-flatten')

module.exports = function(config, etcd){

	// watch /proc and /hosts

	var deployment = new EventEmitter()

	// make sure we dont sit in an endless loop trying to run a failing container
	deployment.canRunJob = function(job, hostname, done){
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
					deployment.removeJob({
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

	// TODO - 
	deployment.writeEndpoint = function(job, opts, done){
		var parts = opts.name.split('/')
		var containerPort = parts[0]
		var proto = parts[1]
		var ip = opts.ip
		if(opts.ports && opts.ports.length){
			var val = opts.ports[0]
			var hostPort = val.HostPort
			var portKey = '/ports/' + job.stack + '/' + job.tag + '/' + job.name + '/' + containerPort + '/' + proto + '/' + ip + '/' + hostPort
			var endpoint = ip + ':' + hostPort
			etcd.set(portKey, endpoint, done)
		}
		else{
			done()
		}
	}

	deployment.writeContainer = function(opts, done){
		var self = this
		var job = opts.job
		var hostname = opts.hostname
		var ip = opts.ip
		var container = opts.container

		var jobObject = Job(job)

		async.parallel([
			function(next){
				
				var ports = container.NetworkSettings.Ports

				async.forEach(Object.keys(ports || {}), function(p, nextPort){
					self.writeEndpoint(job, {
						name:p,
						ip:ip,
						ports:ports[p]
					})
				}, next)
			},

			function(next){
				etcd.set('/deploy/' + hostname + jobObject.key(), job.stack + '-' + job.tag + '-' + job.name, done)
			}
		], done)
	}

	deployment.getStackNames = function(done){
		var self = this
		etcd.get('/proc', function(err, result){
			if(err) return done(err)
			if(!result) return done()
			var nodes = result.node.nodes || []
			
			var stacks = nodes.map(function(node){
				return node.key.replace(/^\/proc\//, '')
			})
			done(null, stacks)
		})
	}

	// list the current stacks we have with their state
	deployment.getStacks = function(done){
		var self = this
		self.getStackNames(function(err, stackNames){
			if(err) return done(err)
			async.map(stackNames, self.getStackState.bind(self), done)
		})
	}

	// get the full status for one job
	deployment.getJobState = function(job, done){
		var self = this
		var jobObject = Job(job)

		this.getJobServer(job, function(err, server){
			if(err) return done(err)


			async.parallel({
				server:function(next){
					etcd.get('/deploy/' + server + jobObject.key(), next)
				},
				ports:function(next){
					etcd.get('/ports' + jobObject.key(), {
						recursive:true
					}, function(err, results){
						if(err) return next(err)
						if(!results) return next()
						var ports = flatten(results.node)
						next(null, ports)
					})
				}
			}, function(err, data){
				if(err) return done(err)
				var state = {
					job:job,
					hostname:server,
					server:data.server,
					ports:data.ports
				}
				done(null, state)
			})
			
		})		
	}

	deployment.getJobServer = function(job, done){
		var jobObject = Job(job)

		etcd.get('/run' + jobObject.key(), function(err, result){
			if(err) return done(err)
			if(!result) return done()
			done(null, result.node.value)
		})
	}

	// return a map of the jobs running for one stack
	// include data about what server and network info
	// this will include the name of the container on the host
	deployment.getStackState = function(name, done){
		var self = this;
		var state = {}
		this.getStackJobs(name, function(err, jobs){
			async.forEach(Object.keys(jobs || {}), function(path, nextJob){
				var job = jobs[path]
				self.getJobState(job, function(err, jobState){
					if(err) return nextJob(err)
					state[path] = jobState
					nextJob()
				})
			}, function(err){
				if(err) return done(err)
				done(null, state)
			})	
		})
		
	}

	// return a map of the jobs running for one stack
	deployment.getStackJobs = function(name, done){
		etcd.get('/proc/' + name, {
			recursive:true
		}, function(err, data){
			if(err) return done(err)
			if(!data){
				return done()
			}
			var procs = flatten(data.node)
			Object.keys(procs || {}).forEach(function(key){
				procs[key] = JSON.parse(procs[key])
			})
			done(null, procs)
		})
	}

	deployment.removeStack = function(name, done){
		var self = this;
		this.getStackState(name, function(err, jobs){

			async.forEach(Object.keys(jobs || {}), function(path, nextJob){
				var state = jobs[path]
				self.removeJob({
					job:state.job,
					hostname:state.hostname,
					removeProc:true

				}, nextJob)
			}, done)
			
		})
		
	}

	deployment.removeServer = function(hostname, removeJobs, done){
		var self = this;

		if(!done){
			done = removeJobs
			removeJobs = false
		}
		utils.log('remove server', hostname)
		etcd.get('/deploy/' + hostname, {
			recursive:true
		}, function(err, data){

			if(!data){
				return done()
			}
			var jobs = tools.flattenResult(data.node)
			async.forEachSeries(Object.keys(jobs), function(jobid, nextJob){

				var job = jobs[jobid]
				var nameParts = tools.jobNameParts(job)
				
				deployment.loadJob(nameParts.stack, nameParts.tag, nameParts.name, function(err, jobObject){

					if(err || !jobObject){
						return nextJob()
					}
					self.removeJob({
						job:jobObject,
						hostname:hostname,
						removeProc:removeJobs,
						removeServer:true
					}, nextJob)
				})

			}, done)
		})
	}

	deployment.removeJob = function(opts, done){

		opts = opts || {}

		var job = opts.job
		var hostname = opts.hostname

		var jobObject = Job(job)

		var keys = [
			'/deploy/' + hostname + jobObject.key(),
			'/run' + jobObject.key(),
			'/ports' + jobObject.key()
		]

		utils.log('remove job', jobObject.key())

		if(opts.removeServer){
			keys.push('/fixed' + jobObject.key())
		}

		if(opts.removeProc){
			keys.push('/proc' + jobObject.key())
		}

		async.parallel({
			ports:function(next){
				etcd.get('/ports' + jobObject.key(), function(err, portData){
					if(err) return next(err)
					if(!portData) return next()
					var ports = tools.flattenResult(portData.node)
					next(err, ports)
				})
			},
			jobInfo:function(next){
				etcd.get('/proc' + jobObject.key(), function(err, data){
					if(err){
						return next(err)
					}
					var job = data.node.value
					next(null, job)
				})
			}
		}, function(err, data){

			Object.keys(data.ports || {}).forEach(function(key){
				

				// add the port key for deletion
				if(key.indexOf(jobObject.key())>=0){
					keys.push(key)	
				}
			})

			async.forEach(keys, function(key, nextKey){

				utils.log('remove key', key)
				etcd.del(key, {
					recursive:true
				}, nextKey)
			}, function(){
				if(err) return done(err)
				if(opts.failed){
					etcd.set('/failed' + jobObject.key(), job, done)	
				}
				else{
					done()
				}
				
			})
		})

	}

	deployment.loadJob = function(stack, tag, name, done){
		etcd.get('/proc/' + stack + '/' + tag + '/' + name, function(err, result){
			if(err || !result){
				return done(err || 'no result found')
			}
			done(null, JSON.parse(result.node.value))
		})
	}

	deployment.runJob = function(job, server, done){

		var jobObject = Job(job)
		var serverObject = Server(server)

		async.series([
			function(next){
				etcd.set('/run' + jobObject.key(), serverObject.hostname(), next)
			},

			function(next){
				etcd.set('/deploy/' + serverObject.hostname() + jobObject.key(), '', next)
			}
		], done)
		
	}

	return deployment
	
}
