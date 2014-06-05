var tools = require('./tools')
var async = require('async')
var AllocateServer = require('./allocateserver')

function loadAllocations(etcd, state, done){

	if(err){
		return done(err)
	}

	var runJobs = []
	var allocations = []

	/*
	
		loop over each job in proc and make sure it has an entry in /run (i.e. it is allocated)
		
	*/
	Object.keys(state.proc || {}).forEach(function(key){
		if(!state.run[key]){
			runJobs.push(state.proc[key])
		}
	})

	if(runJobs.length<=0){
		return done(null, [])
	}

	var serverIds = Object.keys(state.host || {})
	if(serverIds.length<=0){
		return done('no servers')
	}

	// run jobs is an array of jobs that are in /proc but not in /run (need allocating)
	async.forEach(runJobs, function(job, nextJob){
		AllocateServer(etcd, job, state, function(err, server){
			if(err){
				return nextJob(err)
			}
			if(!server){
				return nextJob('no servers')
			}
			allocations.push({
				job:job,
				server:server
			})
			nextJob()
		})


	}, function(err){

		// we have a list of allocations that is jobs to deploy onto servers
		done(err, allocations)
	})
}

module.exports = loadAllocations