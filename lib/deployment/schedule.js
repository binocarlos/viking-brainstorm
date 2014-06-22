var async = require('async')
var Job = require('../tools/job')
var tools = require('../tools')
var flatten = require('etcd-flatten')
var endpoints = require('./endpoints')
var env = require('../tools/env')
var logger = require('../tools/logger')

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

	function getScaleJobs(job){
		var jobs = []

		var scale = job.scale || 1

		while(scale>0){
			scale--
			var scaleJob = JSON.parse(JSON.stringify(job))
			var jobObject = Job(scaleJob)
			jobObject.ensureValues()
			jobs.push(scaleJob)
		}

		return jobs
	}

	function writeScaleJobs(job, done){
		var scaleJobs = getScaleJobs(job)

		async.forEachSeries(scaleJobs, function(runJob, nextJob){
			writeJob(runJob, nextJob)
		}, function(err){
			done(err, scaleJobs)
		})
	}

	function writeJob(job, done){
		var self = this;
		var jobObject = Job(job)
		jobObject.ensureValues()

		var key = tools.jobKey('proc', job)
		logger('[schedule write] ' + job.id + ' ' + key + ' [json] ' + JSON.stringify(job))
		
		etcd.set(key, JSON.stringify(job), done)
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

	// this is once we have allocated
	// by writing to /deploy the slave will kick in and run the job
	function runJob(job, server, done){
 
		var jobObject = Job(job)
		jobObject.ensureValues()

		logger('[schedule run] ' + job.id + ' [json] ' + JSON.stringify({
			job:job,
			server:server.name
		}))

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

		logger('[schedule endpoint] ' + job.id)// + ' [json] ' + JSON.stringify(opts))

		endpoints.writeEndpoint(etcd, job, opts, done)
		
	}

	function writeDockerEndpoint(settings, done){

		logger('[schedule docker endpoint]')//' [json] ' + JSON.stringify(settings))

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

	function loadJobByPath(path, done){
		etcd.get('/proc/' + path, function(err, result){
			if(err || !result){
				return done(err || 'no result found')
			}
			done(null, JSON.parse(result.node.value))
		})
	}

	function loadJobStatusByPath(path, done){
		etcd.get('/log/' + path, function(err, result){
			if(err || !result){
				return done(err || 'no result found')
			}
			done(null, JSON.parse(result.node.value).action)
		})
	}

	function loadJob(job, done){
		if(typeof(job)=='string'){
			job = job.replace(/-/g, '/')
			loadJobByPath(job, done)
			return
		}
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

		logger('[remove job] ' + jobObject.key() + ' [json] ' + JSON.stringify(opts))

		getJobServer(job, function(err, hostname){
			if(err) return done(err)

			if(!hostname){
				logger.error('no hostname loaded for job destroy: ' + job.id)
				console.log('-------------------------------------------');
				console.log('error no hostname')
				process.exit(1)
			}

			var keys = [
				'/run' + jobObject.key(),
				'/ports' + jobObject.key(),
				//'/log' + jobObject.key(),
				'/container' + jobObject.key()
			]

			if(hostname){
				keys.push('/deploy/' + hostname + jobObject.key())
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
						if(!data){
							return next('no data')
						}
						if(data.dir){
							return next('data is a directory')
						}
						var job = data.node.value
						next(null, job)
					})
				}
			}, function(err, data){

				Object.keys(data.ports || {}).forEach(function(key){
					// add the port key for deletion
					if(key.indexOf(jobObject.key())>=0){
						var portParts = key.split('/')
						portParts.pop()
						key = portParts.join('/')
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

	function getPIDS(job, done){

		var key = '/proc/' + job.stack + '/' + job.tag + '/' + job.name

		etcd.get('/proc/' + job.stack + '/' + job.tag + '/' + job.name, {
			recursive:true
		}, function(err, results){

			if(err) return done(err)
			results = flatten(results.node)

			var pids = Object.keys(results || {}).map(function(key){
				var parts = key.split('/')
				return parts.pop()
			})

			done(null, pids)
		})
	}

	return {
		ensureJob:ensureJob,
		findJob:findJob,
		writeJob:writeJob,
		writeScaleJobs:writeScaleJobs,
		getScaleJobs:getScaleJobs,
		runJob:runJob,
		writeEndpoint:writeEndpoint,
		writeDockerEndpoint:writeDockerEndpoint,
		getJobServer:getJobServer,
		getJobState:getJobState,
		loadJobByPath:loadJobByPath,
		loadJob:loadJob,
		removeJob:removeJob,
		getPIDS:getPIDS
	}
}
