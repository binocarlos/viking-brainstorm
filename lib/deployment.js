// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var Job = require('./job')
var Server = require('./server')
var tools = require('./tools')
module.exports = function(config, etcd){

	// watch /proc and /hosts

	var deployment = new EventEmitter()

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
						removeProc:true
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

	deployment.writeEndpoint = function(job, opts, done){
		var parts = opts.name.split('/')
		var containerPort = parts[0]
		var proto = parts[1]
		var ip = opts.ip
		if(opts.ports && opts.ports.length){
			var val = opts.ports[0]
			var hostPort = val.HostPort
			var portKey = '/ports/' + job.stack + '/' + job.name + '/' + containerPort + '/' + proto + '/' + ip + '/' + hostPort + '/' + job.id
			var endpoint = ip + ':' + hostPort
			etcd.set(portKey, endpoint, done)
		}
		else{
			done()
		}
	}

	deployment.writeContainer = function(opts, done){
		var self = this;
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
				etcd.set('/deploy/' + hostname + jobObject.key(), job.stack + '-' + job.name + '-' + job.id, done)
			}
		], done)
	}

	deployment.removeServer = function(hostname, done){
		var self = this;
		etcd.get('/deploy/' + hostname, {
			recursive:true
		}, function(err, data){
			var jobs = tools.flattenResult(data)

			async.forEach(jobs, function(job, nextJob){
				self.removeJob({
					job:job,
					hostname:hostname,
					removeProc:false,
					removeServer:true
				}, nextJob)
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
					var ports = tools.flattenResult(portData)
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
				var parts = key.split('/')
				var jobid = parts[parts.length-1]
				if(jobid==job.id){
					keys.push(key)	
				}
			})

			async.forEach(keys, function(key, nextKey){
				etcd.del(key, {
					recursive:true
				}, nextKey)
			}, function(){
				etcd.set('/failed' + jobObject.key(), job, done)
			})
		})

	}

	deployment.run = function(job, server, done){

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
