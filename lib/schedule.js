var utils = require('component-consoler');
var tools = require('./tools')
var async = require('async')

// you write jobs to the schedule
module.exports = function(config, etcd, deployed){

	// we only want one
	function ensureJob(job, done){
		findJob(job, function(err, existingjob){
			if(err){
				return done(err)
			}
			if(existingjob){
				return done(null, existingjob)
			}

			writeJob(job, done)

			/*
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('RUN THE ')
			deployed.ps(job, function(err, results){
				if(err){
					return done(err)
				}
				if(results.length<=0){
					writeJob(job, done)
				}
				else{
					done()
				}
			})*/
		})
		
	}

	// get a list of /core/registry
	function findJob(job, done){
		etcd.get(tools.jobKey('proc', job), {
			recursive:true
		}, function(err, data){
			if(err){
				return done(err)
			}
			if(data){
				var nodes = data.node.nodes.map(function(n){
					return JSON.parse(n.value)
				})
				data = nodes[0]
			}
			done(err, data)
		})
	}

	function writeJob(job, done){
		job.id = tools.littleid()
		utils.log('schedule write', job.stack + ' - ' + job.name)
		var key = tools.jobKey('proc', job)
		etcd.set(key, JSON.stringify(job), done)
	}

	function removeJob(job, done){
		etcd.del(tools.jobKey('proc', job), {
			recursive:true,
			dir:true
		}, done)
	}

	function removeAll(done){
		etcd.del('/proc', {
			recursive:true,
			dir:true
		}, done)
	}

	function list(filter, done){
		etcd.get('/proc', {
			recursive:true
		}, done)
	}

	return {
		ensure:ensureJob,
		write:writeJob,
		remove:removeJob,
		removeAll:removeAll
	}

}