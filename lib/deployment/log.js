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
				var node = data.node

				var value = JSON.parse(node.value)

				done(null, value.action)
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
			var node = result.node

			var value = JSON.parse(node.value)

			done(null, value.action)
		})
	}

	function removeContainer(containerName, done){
		var key = containerName.replace(/-/g, '/')
		etcd.del('/log/' + key, {
			recursive:true
		}, done)
	}

	function failContainer(job, done){
		var jobObject = Job(job)
		var key = jobObject.key()
		writeEvent({
			stack:job.stack,
			action:'fail',
			key:key
		}, done)
	}

	function delayContainer(job, done){
		var jobObject = Job(job)
		var key = jobObject.key()
		writeEvent({
			stack:job.stack,
			action:'delay',
			key:key
		}, done)
	}

	function runContainer(job, done){
		var jobObject = Job(job)
		var key = jobObject.key()
		writeEvent({
			stack:job.stack,
			action:'run',
			key:key
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
