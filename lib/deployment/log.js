var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var Job = require('../tools/job')
var tools = require('../tools')
var logger = require('../tools/logger')

// the log allows events to be written and subscribed too

module.exports = function(config, etcd){

	function trackDeployment(job, done){
		var jobObject = Job(job)
		var key = jobObject.key()

		this._etcd.wait('/log' + key, {
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
				done(data)
			}
		})
	}

	function writeEvent(event, done){
		var key = '/log' + event.key
		var value = JSON.stringify(event)
		etcd.set(key, value, done)
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
			key:key + '/fail'
		}, done)
	}

	function runContainer(job, done){
		var jobObject = Job(job)
		var key = jobObject.key()
		writeEvent({
			stack:job.stack,
			key:key + '/run'
		}, done)
	}


	var log =  {
		trackDeployment:trackDeployment,
		writeEvent:writeEvent,
		removeContainer:removeContainer,
		failContainer:failContainer,
		runContainer:runContainer
	}

	return log
	
}
