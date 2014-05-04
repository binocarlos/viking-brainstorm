// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter

// Because planning - Hugh Dowding (in case you were wandering)
module.exports = function(jobs, etcd, network, done){

	// filter the servers based on tags of job
	function getServersForJob(job){
		return network.filter(job)
	}

	async.forEach(jobs, function(job, nextJob){

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('Dowdijng plan job')
		var servers = getServersForJob(job)


	}, done)
}