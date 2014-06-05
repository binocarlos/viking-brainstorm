// the leader runs the registry and the git push
var async = require('async')
var Job = require('../tools/job')
var tools = require('../tools')
var flatten = require('etcd-flatten')
var deck = require('deck')

module.exports = function(config, etcd){
	
	function getHostnamesFromDeploy(deploy){
		var ret = {}
		Object.keys(deploy || {}).forEach(function(key){
			var hostname = key.split('/')[1]
			ret[hostname] = true
		})
		return ret
	}

	return {

		removeServers:function(done){
			var self = this;
			self.getState(function(err, state){

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
					self.removeServer(removeHostname, false, nextRemove)
				}, done)

			})
		},

		removeServer:function(hostname, removeJobs, done){
			var self = this;

			if(!done){
				done = removeJobs
				removeJobs = false
			}
			console.log('[remove server]' + hostname)
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
					
					self.loadJob(job, function(err, jobObject){

						if(err || !jobObject){
							return nextJob()
						}
						self.removeJob({
							job:jobObject,
							removeProc:removeJobs,
							removeServer:true
						}, nextJob)
					})

				}, done)
			})
		}
	}
}
