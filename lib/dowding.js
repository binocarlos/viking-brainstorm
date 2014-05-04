// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var State = require('./state')
var Job = require('./job')
var Server = require('./server')
var deck = require('deck')

// Because planning - Hugh Dowding (in case you were wandering)
module.exports = function(etcd, network, done){

	// filter the servers based on tags of job
	function getServersForJob(job){
		return network.filter(job)
	}

	function chooseByHostname(servers, hostname){
		var ret = servers.filter(function(s){
			return s.config.network.hostname==hostname
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
	function pickServerForJob(job, servers, done){
		var jobObject = Job(job)

		// this means we have to write to /fixed/[stack]/[name]/[id] = hostname
		// then we can re-deploy to the same place
		if(jobObject.isFixed()){

			function chooseNew(){
				var server = chooseLeastBusy(servers)

				etcd.set('/fixed' + jobObject.key(), server.config.network.hostname, function(err){
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

			var servers = getServersForJob(job)

			if(!servers || !servers.length){
				return nextJob('no servers')
			}

			pickServerForJob(job, servers, function(err, server){

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