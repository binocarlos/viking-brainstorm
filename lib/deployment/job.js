// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Job = require('../tools/job')
var tools = require('../tools')
var flatten = require('etcd-flatten')
var endpoints = require('../tools/endpoints')
var env = require('../tools/env')

module.exports = function(config, etcd){

	return {


		writeEndpoint:function writeEndpoint(job, opts, done){

			endpoints.writeEndpoint(etcd, job, opts, done)
			
		},

		writeDockerEndpoint:function writeDockerEndpoint(settings, done){

			endpoints.writeDockerEndpoint(etcd, settings, done)
			
		},


		getJobServer:function getJobServer(job, done){
			var jobObject = Job(job)

			etcd.get('/run' + jobObject.key(), function(err, result){
				if(err) return done(err)
				if(!result) return done()
				done(null, result.node.value)
			})
		},

		getJobState:function getJobState(job, done){
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
		},

		ensureJob:function ensureJob(job, done){
			var self = this;
			self.findJob(job, function(err, existingjob){
				if(err){
					return done(err)
				}
				if(existingjob){
					return done(null, existingjob)
				}

				self.writeJob(job, done)
			})
			
		},


		// get a list of /core/registry
		findJob: function findJob(job, done){
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
		},


		writeJob: function writeJob(job, done){
			var self = this;
			var jobObject = Job(job)
			jobObject.ensureValues()

			env.process(job.env || {}, function(err, envResults){
				job.env = envResults
				utils.log('schedule write', job.stack + ' - ' + job.name)
				var key = tools.jobKey('proc', job)
				etcd.set(key, JSON.stringify(job), done)
			})
			
		},

		loadJob:function loadJob(stack, tag, name, done){
			etcd.get('/proc/' + stack + '/' + tag + '/' + name, function(err, result){
				if(err || !result){
					return done(err || 'no result found')
				}
				done(null, JSON.parse(result.node.value))
			})
		},

		runJob:function runJob(job, server, done){
 
			var jobObject = Job(job)

			async.series([
				function(next){
					etcd.set('/run' + jobObject.key(), server.name, next)
				},

				function(next){
					etcd.set('/deploy/' + server.name + jobObject.key(), '', next)
				}
			], done)
			
		},

		removeJob:function removeJob(opts, done){

			var self = this;
			opts = opts || {}

			var job = opts.job
			var jobObject = Job(job)

			utils.log('remove job', jobObject.key())

			self.getJobServer(job, function(err, hostname){
				if(err) return done(err)

				var keys = [
					'/run' + jobObject.key(),
					'/ports' + jobObject.key()
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
			})
		}
	}
}
