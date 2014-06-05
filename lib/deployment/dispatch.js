// the leader runs the registry and the git push
var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var Job = require('../../tools/job')
var tools = require('./tools')
var AllocateServer = require('./allocate')

// Because planning - Hugh Dowding (in case you were wandering)
module.exports = function(config, etcd){

	return {
		dispatchJobs:function runAllocations(allocations, done){
			var self = this;
			if(allocations && allocations.length>0){
				async.forEach(allocations, function(allocation, nextAllocation){

					self.runJob(allocation.job, allocation.server, nextAllocation)

				}, function(err){
					done(err, allocations)
				})
			}
			else{
				done()
			}
		},

		getAllocations:function getAllocations(done){
			var self = this;
			self.getState(function(err, state){

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
					AllocateServer(job, state, function(err, server){
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

			})
		}
	}
	
}
