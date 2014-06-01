// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Job = require('../tools/job')
var tools = require('../tools')
var flatten = require('etcd-flatten')
var deck = require('deck')

module.exports = function(config, etcd){
	
	return {

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
