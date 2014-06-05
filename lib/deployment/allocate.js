// the leader runs the registry and the git push
var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var Job = require('../tools/job')
var deck = require('deck');

// Because planning - Hugh Dowding (in case you were wandering)
module.exports = function(config, etcd){

	function sortCandidates(a,b) {
	  if (a.score < b.score)
	     return 1;
	  if (a.score > b.score)
	    return -1;
	  return 0;
	}

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

		var counts = {}
		var serverMap = {}

		servers.forEach(function(server){
			serverMap[server.name] = server
			counts[server.name] = 0
		})

		Object.keys(state.run || {}).forEach(function(key){
			var hostname = state.run[key]
			counts[hostname] = counts[hostname] || 0
			counts[hostname]++
		})

		var objs = Object.keys(serverMap || {}).map(function(key){
			return {
				score:counts[key],
				id:key
			}
		})

		objs.sort(sortCandidates)
		objs.reverse()

		var lowScore = null
		objs = objs.filter(function(obj){
			if(lowScore===null){
				lowScore = obj.score
			}
			return obj.score==lowScore
		})

		var obj = deck.pick(objs)
		return serverMap[obj.id]
	}


	// the servers have been filtered
	// pick one based on:
	//
	// 1. fixed - is the job fixed
	// 2. load - the least busy server
	// 
	function pickServerFromCandidates(state, job, servers, done){
		var jobObject = Job(job)

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
		var highScore = null
		candidates = candidates.filter(function(candidate){
			if(!highScore){
				highScore = candidate.score
			}
			return candidate.score==highScore
		})			
		return candidates.map(function(c){
			return c.host
		})
	}


	function injectObject(obj, path, value){
		var parts = path.split('/')
		var lastfield = parts.pop()
		var current = obj
		while(parts.length){
			var next = parts.shift()
			if(!current[next]){
				current[next] = {}
			}
			current = current[next]
		}
		current[lastfield] = value
	}

	// temporarily record the state so the next allocation has a good picture
	// this means we can do a batch of allocations without actually commiting them
	function injectJobIntoState(job, hostname, state){

		state.run['/' + job.id] = hostname
		state.deploy['/' + hostname + '/' + job.id] = job.id
		
	}
	

	function allocateServer(job, state, done){

		var candidates = getCandidatesForJob(job, state.host)

		if(!candidates || !candidates.length){
			return done('no servers')
		}

		pickServerFromCandidates(state, job, candidates, function(err, server){
			if(err) return done(err)
			if(!server) return done('no server found')
			injectJobIntoState(job, server.name, state)
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
					allocateServer(job, state, function(err, server){
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
