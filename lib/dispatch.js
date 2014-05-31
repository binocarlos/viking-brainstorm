// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var Job = require('./tools/job')
var deck = require('deck')
var Deployment = require('./deployment')

// Because planning - Hugh Dowding (in case you were wandering)
module.exports = function(config, etcd){

	var deployment = Deployment(config, etcd)
	return {
		runAllocations:function runAllocations(allocations, done){
			if(allocations && allocations.length>0){
				async.forEach(allocations, function(allocation, nextAllocation){

					deployment.runJob(allocation.job, allocation.server, nextAllocation)

				}, function(err){
					done(err, allocations)
				})
			}
			else{
				done()
			}
		},

		getAllocations:function getAllocations(done){
			deployment.getState(function(err, state){
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

				// run jobs is an array of jobs that are in /proc but not in /run (need allocating)
				async.forEach(runJobs, function(job, nextJob){

					var candidates = deployment.getCandidatesForJob(job, state.hosts)

					if(!candidates || !candidates.length){
						return nextJob('no servers')
					}

					deployment.pickServerFromCandidates(state, job, candidates, function(err, server){
						if(err) return nextJob()
						if(!server) return nextJob()
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

			})
		}
	}
	
}