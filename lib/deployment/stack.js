// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var Job = require('./job')
var tools = require('./tools')
var flatten = require('etcd-flatten')

module.exports = function(config, etcd){

	return {

		getStackState = function(name, done){
			var self = this;
			var state = {}
			this.getStackJobs(name, function(err, jobs){
				async.forEach(Object.keys(jobs || {}), function(path, nextJob){
					var job = jobs[path]
					self.getJobState(job, function(err, jobState){
						if(err) return nextJob(err)
						state[path] = jobState
						nextJob()
					})
				}, function(err){
					if(err) return done(err)
					done(null, state)
				})	
			})
			
		},

		getStackJobs:function(name, done){
			etcd.get('/proc/' + name, {
				recursive:true
			}, function(err, data){
				if(err) return done(err)
				if(!data){
					return done()
				}
				var procs = flatten(data.node)
				Object.keys(procs || {}).forEach(function(key){
					procs[key] = JSON.parse(procs[key])
				})
				done(null, procs)
			})
		},

		removeStack:function(name, done){
			var self = this;
			this.getStackState(name, function(err, jobs){

				async.forEach(Object.keys(jobs || {}), function(path, nextJob){
					var state = jobs[path]
					self.removeJob({
						job:state.job,
						hostname:state.hostname,
						removeProc:true

					}, nextJob)
				}, done)
				
			})
			
		}


	}

}
