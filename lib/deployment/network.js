// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Job = require('../tools/job')
var tools = require('../tools')
var flatten = require('etcd-flatten')
var deck = require('deck')

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


	function filterHost(job, host){
		var jobObject = Job(job)
		var jobTags = jobObject.tags()
		var tags = Object.keys(jobTags || {})


		var hostTags = {}

		var tags = (host.config.tags || '').split(/\s+/)

		tags.forEach(function(t){
			hostTags[t] = true
		})

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
				return host.config[key]==tagValue
			}
		})

		return matching.length>=tags.length
	}
	
	return {

		pickServerFromCandidates:pickServerFromCandidates,

		getCandidatesForJob:function(job, hosts){
			return Object.keys(hosts || {}).filter(function(key){
				return filterHost(job, hosts[key])
			}).map(function(key){
				return hosts[key]
			})
		},

		removeServer:function(hostname, removeJobs, done){
			var self = this;

			if(!done){
				done = removeJobs
				removeJobs = false
			}
			utils.log('remove server', hostname)
			etcd.get('/deploy/' + hostname, {
				recursive:true
			}, function(err, data){

				if(!data){
					return done()
				}
				var jobs = tools.flattenResult(data.node)
				async.forEachSeries(Object.keys(jobs), function(jobid, nextJob){

					var job = jobs[jobid]
					var nameParts = tools.jobNameParts(job)
					
					self.loadJob(nameParts.stack, nameParts.tag, nameParts.name, function(err, jobObject){

						if(err || !jobObject){
							return nextJob()
						}
						self.removeJob({
							job:jobObject,
							hostname:hostname,
							removeProc:removeJobs,
							removeServer:true
						}, nextJob)
					})

				}, done)
			})
		}
	}
}
