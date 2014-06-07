// the leader runs the registry and the git push
var async = require('async')
var Job = require('../tools/job')
var tools = require('../tools')
var flatten = require('etcd-flatten')
var deck = require('deck')
var State = require('./state')
var Schedule = require('./schedule')
var logger = require('../tools/logger')

module.exports = function(config, etcd){
	
	var getState = State(config, etcd)
	var schedule = Schedule(config, etcd)
	
	function getHostnamesFromDeploy(deploy){
		var ret = {}
		Object.keys(deploy || {}).forEach(function(key){
			var hostname = key.split('/')[1]
			ret[hostname] = true
		})
		return ret
	}

	function removeServer(hostname, removeJobs, done){
		var self = this;

		if(!done){
			done = removeJobs
			removeJobs = false
		}
		logger('[remove server] ' + hostname)
		etcd.get('/deploy/' + hostname, {
			recursive:true
		}, function(err, data){

			if(!data){
				logger('[no etcd server running] ' + hostname)
				return done()
			}
			var jobs = tools.flattenResult(data.node)
			async.forEachSeries(Object.keys(jobs), function(jobid, nextJob){

				var job = jobs[jobid]
				var nameParts = tools.jobNameParts(job)
				
				schedule.loadJob(job, function(err, jobObject){

					if(err || !jobObject){
						return nextJob()
					}
					schedule.removeJob({
						job:jobObject,
						removeProc:removeJobs,
						removeServer:true
					}, nextJob)
				})

			}, done)
		})
	}

	function cleanServers(done){
		var self = this;

		getState(function(err, state){

			if(err){
				return done(err)
			}

			var runningHosts = state.host
			// the hostnames that must actually exist
			var hostnames = getHostnamesFromDeploy(state.deploy || {})
			var removeServers = {}
			Object.keys(hostnames || {}).forEach(function(hostname){
				if(!runningHosts[hostname]){
					removeServers[hostname] = true
				}
			})
			var removeHostnames = Object.keys(removeServers || {})

			async.forEachSeries(removeHostnames, function(removeHostname, nextRemove){
				removeServer(removeHostname, false, nextRemove)
			}, done)

		})
	}


	return {

		cleanServers:cleanServers,

		removeServer:removeServer
	}
}
