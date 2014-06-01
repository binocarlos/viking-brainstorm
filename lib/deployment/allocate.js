// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter

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

	function chooseLeastBusy(servers){
		var ret = null
		var memory = null

		console.log('-------------------------------------------');
		console.log('choose least busy')
		console.dir(servers)
		
		servers.forEach(function(server){
			if(!ret){
				ret = server
			}
		})
		return deck.pick(servers)
	}
	

	function filterHost(job, host){
		var jobObject = Job(job)
		var jobTags = jobObject.tags()
		var tags = Object.keys(jobTags || {})

		var hostTags = {}

		var tags = (host.config.tags || '').split(/\s+/)

		tags.forEach(function(t){
			hostTags[t] = true
		})

		console.log('-------------------------------------------');
		console.log('host tags')
		console.dir(hostTags)
		console.log('-------------------------------------------');
		console.log('job tags')
		console.dir(jobTags)

		var matching = tags.filter(function(key){
			var tagValue = jobTags[key]
			if(typeof(tagValue)=='boolean'){
				var hasProp = host.config.hasOwnProperty(key)
				var hasTag = hostTags[key]
				if(tagValue){
					return hasProp || hasTag
				}
				else{
					return !hasProp && !hasTag
				}
			}
			else{
				if(tagValue=='prefer'){
					return true
				}
				else{
					return host.config[key]==tagValue	
				}
			}
		})

		return matching.length>=tags.length
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
		console.log('-------------------------------------------');
		console.log('state')
		console.dir(state)

		console.log('-------------------------------------------');
		console.log('job')
		console.dir(job)

		console.log('-------------------------------------------');
		console.log('servers')
		console.dir(servers)

		// this means we have to write to /fixed/[stack]/[name]/[id] = hostname
		// then we can re-deploy to the same place
		if(jobObject.isFixed()){

			function chooseNew(){
				var server = chooseLeastBusy(servers)

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
			done(null, chooseLeastBusy(servers))
		}
	}


	function getCandidatesForJob(job, hosts){

		var jobObject = Job(job)
		var jobTags = jobObject.tags()
		var prefers = {}

		Object.keys(jobTags || {}).forEach(function(key){
			var val = jobTags[key]
			if(val=='prefer'){
				prefers[key] = true
			}
		})

		var filtered = Object.keys(hosts || {}).filter(function(key){


			return filterHost(job, hosts[key])
		})


		return filtered.map(function(key){
			return hosts[key]
		})
	}
	

	function allocateServer(job, state, done){

		var candidates = getCandidatesForJob(job, state.host)

		if(!candidates || !candidates.length){
			return done('no servers')
		}

		utils.log('pick server', candidates.length)

		pickServerFromCandidates(state, job, candidates, function(err, server){
			if(err) return nextJob()
			if(!server) return nextJob()

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
