// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var Job = require('./job')
var tools = require('./tools')
var flatten = require('etcd-flatten')

module.exports = function(config, etcd){

	return {

		// return a flat list of the stack names from /proc
		getStackNames:function(done){
			var self = this
			etcd.get('/proc', function(err, result){
				if(err) return done(err)
				if(!result) return done()
				var nodes = result.node.nodes || []
				
				var stacks = nodes.map(function(node){
					return node.key.replace(/^\/proc\//, '')
				})
				done(null, stacks)
			})
		},

		// return an object with stackname onto current state
		getStacks:function(done){
			var self = this
			self.getStackNames(function(err, stackNames){
				if(err) return done(err)
				async.map(stackNames, self.getStackState.bind(self), done)
			})
		},

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
		}

	}

}
