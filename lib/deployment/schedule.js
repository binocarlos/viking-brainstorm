// the leader runs the registry and the git push
var async = require('async')
var Job = require('../tools/job')
var tools = require('../tools')
var flatten = require('etcd-flatten')
var endpoints = require('../tools/endpoints')
var env = require('../tools/env')

module.exports = function(config, etcd){

	function findJob(job, done){
		var self = this;
		etcd.get(tools.jobKey('proc', job), {
			recursive:true
		}, function(err, data){
			if(err){
				return done(err)
			}
			if(data){
				var nodes = (data.node.nodes || []).map(function(n){
					return JSON.parse(n.value)
				})
				data = nodes[0]
			}
			done(err, data)
		})
	}


	function writeJob(job, done){
		var self = this;

		var jobObject = Job(job)
		jobObject.ensureValues()

		console.log('-------------------------------------------');
		console.dir(job)
		process.exit()

		console.log('[schedule write]' + job.id)
		var key = tools.jobKey('proc', job)

		var jobs = []

		var scale = job.scale || 1

		while(scale>0){
			scale--
			var scaleJob = JSON.parse(JSON.stringify(job))
			jobs.push(scaleJob)

		}

		//etcd.set(key, JSON.stringify(job), done)
		done()
		
		
	}

	function ensureJob(job, done){
		var self = this;
		findJob(job, function(err, existingjob){
			if(err){
				return done(err)
			}
			if(existingjob){
				return done(null, existingjob)
			}
			writeJob(job, done)
		})			
	}


	function runJob(job, server, done){
 
		var jobObject = Job(job)

		async.series([
			function(next){
				etcd.set('/run' + jobObject.key(), server.name, next)
			},

			function(next){
				etcd.set('/deploy/' + server.name + jobObject.key(), '', next)
			}
		], done)
		
	}

	function writeEndpoint(job, opts, done){

		endpoints.writeEndpoint(etcd, job, opts, done)
		
	}

	function writeDockerEndpoint(settings, done){

		endpoints.writeDockerEndpoint(etcd, settings, done)
		
	}

	function getJobServer(job, done){
		var jobObject = Job(job)

		etcd.get('/run' + jobObject.key(), function(err, result){
			if(err) return done(err)
			if(!result) return done()
			done(null, result.node.value)
		})
	}

	function getJobState(job, done){
		var self = this
		var jobObject = Job(job)

		getJobServer(job, function(err, server){
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

	function loadJob(path, done){
		etcd.get('/proc/' + path, function(err, result){
			if(err || !result){
				return done(err || 'no result found')
			}
			done(null, JSON.parse(result.node.value))
		})
	}

	function loadJob(job, done){
		var jobObject = Job(job)
		etcd.get('/proc/' + jobObject.key(), function(err, result){
			if(err || !result){
				return done(err || 'no result found')
			}
			done(null, JSON.parse(result.node.value))
		})
	}

	function removeJob(opts, done){

		var self = this;
		opts = opts || {}

		var job = opts.job
		var jobObject = Job(job)

		console.log('[remove job] ' + jobObject.key())

		getJobServer(job, function(err, hostname){
			if(err) return done(err)

			var keys = [
				'/run' + jobObject.key(),
				'/ports' + jobObject.key()
			]

			if(hostname){
				keys.push('/deploy/' + hostname + jobObject.key())
				keys.push('/container/' + hostname + jobObject.key())
			}

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
					console.log('[remove key] ' + key)
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
		})
	}

	return {
		ensureJob:ensureJob,
		findJob:findJob,
		writeJob:writeJob,
		runJob:runJob,
		writeEndpoint:writeEndpoint,
		writeDockerEndpoint:writeDockerEndpoint,
		getJobServer:getJobServer,
		getJobState:getJobState,
		loadJobByPath:loadJobByPath,
		loadJob:loadJob,
		removeJob:removeJob
	}
}
