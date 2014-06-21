var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var Job = require('../tools/job')
var tools = require('../tools')
var logger = require('../tools/logger')

// the log allows events to be written and subscribed too

module.exports = function(config, etcd){


	function writeEvent(event, done){
		var key = '/log' + event.key
		var value = JSON.stringify(event)
		etcd.set(key, value, done)
	}

	function waitContainer(job, done){
		var jobObject = Job(job)
		var key = jobObject.key()

		etcd.wait('/log' + key, {
			recursive:true
		}, function onLog(err, data, next){
			if(err || !data){
				done(err)
			}
			else{
				console.log('-------------------------------------------');
				console.log('-------------------------------------------');
				console.log('-------------------------------------------');
				console.log('-------------------------------------------');
				console.log('TRACK ANSWER')
				console.log(JSON.stringify(data, null, 4))
				process.exit()
				done(data)
			}
		})
	}

	function getStatus(job, done){
		var jobObject = Job(job)
		var key = '/log' + jobObject.key()
		etcd.get(key, {
			recursive:true
		}, function(err, result){
			if(err) return done(err)
			if(!result){
				return done()
			}
			result = flatten(result)
			var keys = Object.keys(result)
			if(keys.length<=0){
				return done()
			}
			var key = keys[0]
			var parts = key.split('/')
			var status = parts.pop()
			done(null, status)
		})
	}

	function removeContainer(containerName, done){
		console.log('REMOVE CONTAINER')
		console.dir(containerName)
		done()
	}

	function failContainer(job, done){
		var jobObject = Job(job)
		var key = jobObject.key()
		writeEvent({
			stack:job.stack,
			action:'fail',
			key:key + '/fail'
		}, done)
	}

	function delayContainer(job, done){
		var jobObject = Job(job)
		var key = jobObject.key()
		writeEvent({
			stack:job.stack,
			action:'delay',
			key:key + '/delay'
		}, done)
	}

	function runContainer(job, done){
		var jobObject = Job(job)
		var key = jobObject.key()
		writeEvent({
			stack:job.stack,
			action:'run',
			key:key + '/run'
		}, done)
	}


	var log =  {
		waitContainer:waitContainer,
		writeEvent:writeEvent,
		getStatus:getStatus,
		delayContainer:delayContainer,
		removeContainer:removeContainer,
		failContainer:failContainer,
		runContainer:runContainer
	}

	return log
	
}
