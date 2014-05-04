// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var State = require('./state')

// Because planning - Hugh Dowding (in case you were wandering)
module.exports = function(etcd, network, done){

	// filter the servers based on tags of job
	function getServersForJob(job){
		return network.filter(job)
	}

	State(etcd, function(err, state){
		if(err){
			return done(err)
		}


		var runJobs = []

		Object.keys(state.proc || {}).forEach(function(key){
			if(!state.run[key]){
				runJobs.push(state.proc[key])
			}
		})

		async.forEach(runJobs, function(job, nextJob){

			var servers = getServersForJob(job)

			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('Dowdijng plan job')
			console.log(JSON.stringify(job, null, 4))
			console.log('-------------------------------------------');
			console.log('servers')
			console.dir(servers)
			nextJob()

		}, done)

	})
}