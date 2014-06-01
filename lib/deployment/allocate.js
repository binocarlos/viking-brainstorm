// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter

// Because planning - Hugh Dowding (in case you were wandering)
module.exports = function(config, etcd){

	return {
		runAllocations:function runAllocations(allocations, done){
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

					utils.log('allocate server', job.stack + ' - ' + job.tag + ' - ' + job.name)
					console.dir(job)

					console.dir(state.host)

					var candidates = self.getCandidatesForJob(job, state.host)

					console.log('-------------------------------------------');
					console.dir(candidates)

					if(!candidates || !candidates.length){
						return nextJob('no servers')
					}

					utils.log('pick server', candidates.length)

					self.pickServerFromCandidates(state, job, candidates, function(err, server){
						if(err) return nextJob()
						if(!server) return nextJob()

						utils.log('server picked', server.name)
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
