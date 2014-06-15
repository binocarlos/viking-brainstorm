// the leader runs the registry and the git push
var async = require('async')
var Job = require('../tools/job')
var tools = require('../tools')
var flatten = require('etcd-flatten')
var endpoints = require('./endpoints')
var env = require('../tools/env')
var logger = require('../tools/logger')
var Schedule = require('./schedule')

module.exports = function(config, etcd){

	var schedule = Schedule(config, etcd)

	function loadJobs(name, tags, done){
		if(typeof(tags)=='string'){
			tags = [tags]
		}
		var jobs = {}

		async.forEachSeries(tags, function(tag, nexTag){
			etcd.get('/proc/' + name + '/' + tag, {
				recursive:true
			}, function(err, result){
				if(err) return nexTag(err)
				if(!result) return nextTag('no result')
				result = flatten(result)
				Object.keys(result || {}).forEach(function(key){
					jobs[key] = result[key]
				})
				nextTag()
			})
		}, function(err){
			if(err) return done(err)
			done(null, jobs)
		})
	}


	function loadTags(name, done){
		etcd.get('/stack/' + name + '/tag', {
			recursive:true
		}, function(err, result){
			if(err) return done(err)
			if(!result) return done('no data')

			result = flatten(result.node)

			done(null, result)
		})
	}

	function loadPhases(name, done){
		etcd.get('/stack/' + name + '/phase', {
			recursive:true
		}, function(err, result){
			if(err) return done(err)
			if(!result) return done('no data')

			result = flatten(result.node)

			done(null, result)
		})
	}

	function writeStack(name, tag, phase, data, done){
		var packet = JSON.stringify(data)

		async.series([
		  function(next){
				etcd.set('/stack/' + name + '/tag/' + tag, packet, next)
		  },

		  function(next){
				etcd.set('/stack/' + name + '/phase/' + tag, phase, next)
		  }
		], done)
		
	}

	function removeStack(name, tag, done){
		etcd.del('/stack/' + name + '/tag/' + tag, done)
	}

	function checkExists(name, tag, done){

		var key = '/stacks/' + name + '/tag/' + tag
		loadTags(name, function(err, result){
			if(result){
				if(result[key]){
					done(null, result[key])
				}
				else{
					done()
				}
			}
			else{
				done()
			}
		})
		
	}

	function remove(name, tag, done){
		loadJobs(name, [tag], function(err, jobs){
			if(err) return done(err)
			async.forEachSeries(Object.keys(jobs), function(key, nextJob){
				var job = jobs[key]
				schedule.removeJob({
					job:job,
					removeProc:true,
					removeServer:true
				}, nextJob)
			}, function(err){
				if(err) return done(err)
				removeStack(stack, done)
			})
		})
	}

	function info(done){
		
	}

	return {

		checkExists:checkExists,
		writeStack:writeStack,
		loadJobs:loadJobs,
		remove:remove

	}
}
