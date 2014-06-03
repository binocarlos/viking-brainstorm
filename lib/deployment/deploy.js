// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Job = require('../tools/job')
var tools = require('../tools')
var flatten = require('etcd-flatten')

module.exports = function(config, etcd){

	return {

		writeEndpoint:function(job, opts, done){
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
		},


		getJobServer:function(job, done){
			var jobObject = Job(job)

			etcd.get('/run' + jobObject.key(), function(err, result){
				if(err) return done(err)
				if(!result) return done()
				done(null, result.node.value)
			})
		},

		getJobState:function(job, done){
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
	}

}
