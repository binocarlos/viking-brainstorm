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

	function load(name, done){
		etcd.get('/stack/' + name, {
			recursive:true
		}, function(err, result){
			if(err) return done(err)
			if(!result) return done('no data')

			result = flatten(result.node)

			done(null, result)
		})
	}

	function writeStack(name, phase, tag, data, done){

		data = {
			stack:data,
			timestamp:new Date().getTime(),
			name:name,
			phase:phase,
			tag:tag
		}

		var packet = JSON.stringify(data)

		etcd.set('/stack/' + name + '/' + phase + '/' + tag, packet, done)
	}

	function checkExists(name, phase, tag, done){

		var key = '/stack/' + name + '/' + phase + '/' + tag

		etcd.get(key, function(err, node){
			if(err || !node){
				done(null, false)
			}
			else{
				done(null, true)
			}
		})
	}

	// remove a whole stack by loading jobs and then removing
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

	function removeStack(name, tag, done){
		etcd.del('/stack/' + name + '/tag/' + tag, done)
	}

	function info(done){
		
	}

	return {

		checkExists:checkExists,
		writeStack:writeStack,
		loadJobs:loadJobs,
		load:load,
		remove:remove

	}
}
