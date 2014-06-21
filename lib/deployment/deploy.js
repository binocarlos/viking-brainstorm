var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var tools = require('../tools')
var Schedule = require('./schedule')
var logger = require('../tools/logger')
var Job = require('../tools/job')
var Log = require('./log')
var Endpoints = require('./endpoints')

module.exports = function(config, etcd){

	var schedule = Schedule(config, etcd)
	var log = Log(config, etcd)

	function deployAndWait(job, done){
		var jobObject = Job(job)
		Endpoints.jobFeedbackTarget(etcd, job, function(err, feedbackTarget){
			var req = hyperquest(feedbackTarget, {
				method:'GET'
			})

			req.pipe(process.stdout)

			log.waitContainer(job, function(err, status){
				done(err, status)
			})

			schedule.writeJob(job, function(){})
		})
	}

	function deployJob(job, done){
		var jobObject = Job(job)
		jobObject.ensureValues()

		logger('[deploy job] ' + jobObject.key())

		// we should run only one of these
		if(jobObject.isStatic()){
			logger('[check static] ' + jobObject.key())
			log.getStatus(job, function(err, status){
				if(status && status=='run'){
					logger('[static running] ' + jobObject.key())
					done(null, {
						status:'already running'
					})
				}
				else{
					logger('[static not running] ' + jobObject.key())
					deployAndWait(job, done)
				}
			})
		}
		else{
			deployAndWait(job, done)
		}
	}

	// take an array of jobs and wait for them all to be run
	function deployBatch(batch, done){
		logger('[run batch and wait] ' + batch.length)

		var batchFns = batch.map(function(job){
			return function(next){
				deployJob(job, next)
			}
		})

		async.parallel(batchFns, done)
	}

	var dispatch =  {
		deployJob:deployJob,
		deployBatch:deployBatch
	}

	return dispatch
	
}
