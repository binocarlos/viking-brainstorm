// the leader runs the registry and the git push
var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var tools = require('../tools')
var Schedule = require('./schedule')
var logger = require('../tools/logger')
var Job = require('../tools/job')
var Log = require('./log')
// Because planning - Hugh Dowding (in case you were wandering)
module.exports = function(config, etcd){

	var schedule = Schedule(config, etcd)
	var log = Log(config, etcd)

	function deployJob(job, done){
		var jobObject = Job(job)

		var scaleJobs = schedule.getScaleJobs(job).map(function(scaleJob){
			return function(next){

				log.trackDeployment(scaleJob, function(err, container){
					console.log('-------------------------------------------');
					console.log('-------------------------------------------');
					console.log('TRACK DEPLOYMENT RESULT')
					console.log('-------------------------------------------');
					console.dir(err)
					console.dir(container)
					next(err, container)
				})

				schedule.writeJob(scaleJob, function(){})
			}
		})

		async.forEach(scaleJobs, done)
	}

	// take an array of jobs and wait for them all to be run
	function deployBatch(batch, done){
		logger('[run batch and wait] ' + batch.length)

		var batchJobs = batch.map(function(job){
			return function(next){

			}
		})

		async.parallel(batchJobs, )
		
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('deploy batch')
		console.log(JSON.stringify(batch, null, 4))
		done()
	}

	var dispatch =  {
		deployBatch:deployBatch
	}

	return dispatch
	
}
