// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var State = require('./state')
var Job = require('../tools/job')
var deck = require('deck')

// Because planning - Hugh Dowding (in case you were wandering)
module.exports = function(etcd, done){

	// filter the servers based on tags of job
	

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

	// find a server for this job
	function getServersForJob(job, hosts){
		return Object.keys(hosts || {}).filter(function(key){
			var host = hosts[key]
			return filterHost(job, host)
		}).map(function(key){
			return hosts[key]
		})
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
	function pickServerForJob(state, job, servers, done){
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

	State(etcd, function(err, state){
		if(err){
			return done(err)
		}


		var runJobs = []
		var allocations = []

		Object.keys(state.proc || {}).forEach(function(key){
			if(!state.run[key]){
				runJobs.push(state.proc[key])
			}
		})

		async.forEach(runJobs, function(job, nextJob){

			var servers = getServersForJob(job, state.hosts)

			if(!servers || !servers.length){
				return nextJob('no servers')
			}

			pickServerForJob(state, job, servers, function(err, server){
				if(err) return nextJob()
				if(!server) return nextJob()
				allocations.push({
					job:job,
					server:server
				})
				nextJob()
			})
			
			

		}, function(err){
			done(err, allocations)
		})

	})
}