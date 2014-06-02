// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var Job = require('../tools/job')
var deck = require('deck');

// Because planning - Hugh Dowding (in case you were wandering)
module.exports = function(config, etcd){


	function serverHostname(s){
		return s.config.network.hostname
	}

	function chooseByHostname(servers, hostname){
		var ret = servers.filter(function(s){
			return serverHostname(s)==hostname
		})
		return ret[0]
	}

	function chooseLeastBusy(servers, state){
		var ret = null
		var memory = null

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('LEAST BUSY')
		console.log(JSON.stringify(servers, null, 4))
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log(JSON.stringify(state, null, 4))
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		servers.forEach(function(server){
			if(!ret){
				ret = server
			}
		})
		return deck.pick(servers)
	}


	// the servers have been filtered
	// pick one based on:
	//
	// 1. fixed - is the job fixed
	// 2. load - the least busy server
	// 
	function pickServerFromCandidates(state, job, servers, done){
		var jobObject = Job(job)

		utils.log('pick server', 'job')

		// this means we have to write to /fixed/[stack]/[name]/[id] = hostname
		// then we can re-deploy to the same place
		if(jobObject.isFixed()){

			function chooseNew(){
				var server = chooseLeastBusy(servers, state)

				etcd.set('/fixed' + jobObject.key(), serverHostname(server), function(err){
					done(err, server)
				})
			}

			etcd.get('/fixed/' + jobObject.key(), function(err, serverName){
				if(serverName){
					var server = chooseByHostname(servers, serverName)
					if(server){
						done(null, server)
					}
					else{
						chooseNew()
					}
				}
				else{
					chooseNew()
				}

			})
		}
		else{
			done(null, chooseLeastBusy(servers, state))
		}
	}


	function getHostTags(host){
		var ret = {}
		var tags = (host.config.tags || '').split(/\s+/)
		tags.forEach(function(t){
			ret[t] = true
		})
		return ret
	}

	function getHostScore(job, host){
		var jobObject = Job(job)
		var hostTags = getHostTags(host)
		var filters = job.filter || []
		var failed = false
		var score = 0

		filters.forEach(function(filter){
			if(filter.flexible){
				if(hostTags[filter.tag]){
					score++
				}
				score++
			}
			else{
				if(!hostTags[filter.tag]){
					failed = true
				}
			}
		})

		if(failed){
			score = 0
		}
		else if(score==0){
			score = 1
		}
		return score
	}

	function sortCandidates(a,b) {
	  if (a.score < b.score)
	     return -1;
	  if (a.score > b.score)
	    return 1;
	  return 0;
	}

	function getCandidatesForJob(job, hosts){
		var candidates = Object.keys(hosts || {}).map(function(key){
			var host = hosts[key]
			var score = getHostScore(job, host)
			return {
				host:host,
				score:score
			}
		}).filter(function(result){
			return result.score>0
		})

		candidates.sort(sortCandidates)

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('CANDIDATES')
		console.dir(candidates)
			
		return candidates.map(function(c){
			return c.host
		})
	}
	

	function allocateServer(job, state, done){

		var candidates = getCandidatesForJob(job, state.host)

		if(!candidates || !candidates.length){
			return done('no servers')
		}

		utils.log('pick server', candidates.length)

		pickServerFromCandidates(state, job, candidates, function(err, server){
			if(err) return done(err)
			if(!server) return done('no server found')
			done(null, server)
		})
	}

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

					allocateServer(job, state, function(err, server){
						if(err){
							return nextJob(err)
						}
						if(!server){
							return nextJob('no servers')
						}
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
