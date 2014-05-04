// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var Job = require('./job')
var Server = require('./server')

module.exports = function(config, etcd){

	// watch /proc and /hosts

	var deployment = new EventEmitter()

	deployment.canRunJob = function(job, hostname, done){
		if(job.system){
			return done(null, true)
		}
		var jobObject = Job(job)
		console.log('-------------------------------------------');
		console.log('get counter')
		console.dir(jobObject.key())
		etcd.get('/counter/' + hostname + jobObject.key(), function(err, data){
			var counter = 0
			if(!err && data){
				counter = parseInt(data.node.value)
			}
			if(isNaN(counter)){
				counter = 0
			}
			counter++
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.dir(counter)
			etcd.set('/counter/' + hostname + jobObject.key(), counter, function(err){
				if(counter>5){
					deployment.remove(job, hostname, function(){
						done(null, false)
					})
				}
				else{
					done(null, true)
				}
			})
		})
	}
	
	deployment.remove = function(job, hostname, done){

		var jobObject = Job(job)
		var keys = [
			'/deploy/' + hostname + jobObject.key(),
			'/run' + jobObject.key(),
			'/fixed' + jobObject.key(),
			'/proc' + jobObject.key()
		]

		etcd.get('/proc' + jobObject.key(), function(err, data){
			if(err){
				return done(err)
			}
			var job = data.node.value
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

		console.log('-------------------------------------------');
		console.log('run')
		console.dir(job)
		console.dir(server)

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
