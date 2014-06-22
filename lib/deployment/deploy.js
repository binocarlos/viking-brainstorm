var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var tools = require('../tools')
var Schedule = require('./schedule')
var logger = require('../tools/logger')
var Job = require('../tools/job')
var Volume = require('../tools/volume')
var Log = require('./log')
var Endpoints = require('./endpoints')
var hyperquest = require('hyperquest')
var env = require('../tools/env')

module.exports = function(config, etcd){

	var schedule = Schedule(config, etcd)
	var log = Log(config, etcd)

	// inject the core ENV based on the stack / tag / image / pid
	function processVikingEnv(job, done){

		job.env = job.env || {}
		etcd.machines(function(err, machines){
			if(err) return done(err)
			job.env.VIKING_ID = job.id
			job.env.VIKING_STACK = job.stack
			job.env.VIKING_TAG = job.tag
			job.env.VIKING_NAME = job.name
			job.env.VIKING_PID = job.pid
			job.env.VIKING_ETCD = machines.join(',')
			done()
		})
		
	}

	function processJobEnv(job, done){
		env.process(job.env || {}, function(err, envResult){
			if(err){
				return done(err)
			}
			job.env = envResult
			done()
		})
	}

	function processJobVolumes(job, done){
		job.volume = (job.volume || []).map(function(vol){
			if(vol.indexOf(':')<0){
				vol = Volume(config, job.stack, vol)
			}
			return vol
		})
		done()
	}

	function loadJobFeedbackTarget(job, done){
		Endpoints.jobFeedbackTarget(etcd, job, function(err, feedbackTarget){
			if(err) return done(err)
			job.feedbackTarget = feedbackTarget
			done()
		})
	}



	// replace the env and create volumes
	// this assumes this is happening on the allocated machine
	function prepareJob(job, done){

		async.series([
		  function(next){
				processVikingEnv(job, next)
		  },
		  function(next){
				processJobEnv(job, next)
		  },
		  function(next){
				processJobVolumes(job, next)
		  },
		  function(next){
				loadJobFeedbackTarget(job, next)
		  }
		], done)

	}

	// prepare the job and then wait for it to be deployed
	function manageDeployment(job, done){
		
		prepareJob(job, function(err){
			if(err) return done(err)

				console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log(JSON.stringify(job, null, 4))
			process.exit()
			var req = hyperquest(job.feedbackTarget, {
				method:'GET'
			})

			req.pipe(process.stdout)

			log.waitContainer(job, function(err, status){
				done(err, status)
			})

			// this is what triggers the dispatch and deployment onto the allocated slave
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
					manageDeployment(job, done)
				}
			})
		}
		else{
			manageDeployment(job, done)
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
