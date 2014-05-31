// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Job = require('../tools/job')
var tools = require('../tools')
var flatten = require('etcd-flatten')

module.exports = function(config, etcd){

	return {

		ensureJob: function ensureJob(job, done){
			findJob(job, function(err, existingjob){
				if(err){
					return done(err)
				}
				if(existingjob){
					return done(null, existingjob)
				}

				writeJob(job, done)
			})
			
		},


		// get a list of /core/registry
		findJob: function findJob(job, done){
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

			if(job.system){
				job.tag = 'system'
			}
			else if(!job.tag){
				job.tag = 'default'
			}
			utils.log('schedule write', job.stack + ' - ' + job.name)
			var key = tools.jobKey('proc', job)
			etcd.set(key, JSON.stringify(job), done)
			
		},


		loadJob = function loadJob(stack, tag, name, done){
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
	}
}
