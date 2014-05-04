// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var Job = require('./job')
var Server = require('./server')

module.exports = function(config, etcd){

	// watch /proc and /hosts

	var deployment = new EventEmitter()

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
