var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var tools = require('../tools')
var Schedule = require('./schedule')
var logger = require('../tools/logger')
var Job = require('../tools/job')
var images = require('../tools/images')
var Volume = require('../tools/volume')
var Log = require('./log')
var Endpoints = require('./endpoints')
var hyperquest = require('hyperquest')
var env = require('../tools/env')

module.exports = function(config, etcd){

	var schedule = Schedule(config, etcd)
	var log = Log(config, etcd)

	// inject the core ENV based on the stack / tag / image / pid
	function processCoreEnv(job, done){

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

	function processLinkedEnv(job, done){
		if(!job.link){
			return done()
		}

		if(typeof(job.link)==='string'){
			job.link = [job.link]
		}

		async.forEachSeries(job.link, function(link, nextLink){
			var linkstack = job.stack
			var linkname = link
			if(link.indexOf('/')>0){
				var parts = link.split('/')
				linkstack = parts[0]
				linkname = parts[1]
			}
			
			Endpoints.endpoint(etcd, '/' + linkstack + '/static/' + linkname, function(err, address){
				if(err) return nextLink(err)
				console.log('-------------------------------------------');
				console.log('-------------------------------------------');
				console.log('HAVE FOUND LINK!')
				console.log('-------------------------------------------');
				console.dir(job)
				console.dir(address)
				nextLink()

			})
		}, done)
	}

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

	// replace the image pointer with the location of the registry
	function processJobImage(stack, job, done){

		if((job.image || '').indexOf('viking:')==0){

			var img = job.image.replace(/^viking:/, '')
			var parts = img.split('/')
			var stackname = parts[0]
			var name = parts[1]
			job.image = images.remoteName(stack.registry, stackname, stack.tag, name)
			done()
		}
		else{
			done()
		}
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
	function prepareJob(stack, job, done){

		async.series([
			function(next){
				if(stack){
					processJobImage(stack, job, next)	
				}
				else{
					next()
				}
			},
		  function(next){
				processCoreEnv(job, next)
		  },
		  function(next){
				processJobEnv(job, next)
		  },
		  function(next){
				processLinkedEnv(job, next)
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
	function manageDeployment(stack, job, done){
		
		var req = hyperquest(job.feedbackTarget, {
			method:'GET'
		})

		req.pipe(process.stdout)

		log.waitContainer(job, function(err, status){


      if(status=='run'){
        logger('[' + job.id + ' running]')
      }
      else if(status=='delay'){
        logger('[' + job.id + ' delayed]') 
      }
      else if(status=='fail'){
        logger('[' + job.id + ' failed]')
        err = 'job failed'
      }

			done(err, status)
		})

		// this is what triggers the dispatch and deployment onto the allocated slave
		schedule.writeJob(job, function(){})
	}

	function deployJob(stack, job, done){
		var jobObject = Job(job)
		jobObject.ensureValues()

		logger('[deploy job] ' + jobObject.key())

		log.getStatus(job, function(err, status){

			if(status=='failed'){
				return done('job failed')
			}
			
			// we should run only one of these
			if(jobObject.isStatic()){
				logger('[check static] ' + jobObject.key())
				
				if(status && status=='run'){
					logger('[static running] ' + jobObject.key())
					done(null, {
						status:'already running'
					})
				}
				else{
					logger('[static not running] ' + jobObject.key())
					manageDeployment(stack, job, done)
				}

			}
			else{
				manageDeployment(stack, job, done)
			}
		})
	}

	// take an array of jobs and wait for them all to be run
	function deployBatch(stack, batch, done){
		logger('[run batch and wait] ' + batch.length)

		async.forEachSeries(batch, function(job, nextJob){

			/*
			
				HANDLE OTHER TYPES HERE
				
			*/
			if(job.type){
				logger('[different node type] ' + job.name + ' - ' + job.type)
				nextJob()
			}
			else{
				logger('[deploy job] ' + job.name)
				deployJob(stack, job, nextJob)	
			}

		}, done)

	}

	// expand the scale for each job in a batch
	function prepareBatch(stack, batch, done){
    async.forEach(batch, function(job, nextJob){
    	prepareJob(stack, job, nextJob)
    }, function(err){
    	if(err) return done(err)
    	done(null, batch)
    })
	}

	function duplicateJob(job){
		var scaleJob = JSON.parse(JSON.stringify(job))
		var jobObject = Job(scaleJob)
		jobObject.ensureValues()
		return job
	}

	function getScaleJobs(job){
		var jobs = []

		var scale = job.scale || 1

		while(scale>0){
			scale--
			jobs.push(duplicateJob(job))
		}

		return jobs
	}

	// load the registry location
	function prepareStack(stack, done){
		stack.ensureRegistry(done)
	}

	function loopStackBatches(stack, done){

		var scaleBatch = []

		var batches = stack.getBatches().map(function(batch){
			return batch.map(function(name){
				var job = duplicateJob(stack.getJob(name))
				var scale = (job.scale || 1)-1

				while(scale>0){
					scale--
					var scaleJob = duplicateJob(job)
					delete(scaleJob.scale)
					scaleBatch.push(scaleJob)
				}

				delete(job.scale)
				return job
			})
		})

		if(scaleBatch.length){
			batches.push(scaleBatch)	
		}

    // each element in the bootOrder is a batch
    async.forEachSeries(batches, function(batch, nextBatch){

      logger('[run batch] ' + stack.getId() + ' - ' + batch.length + ' jobs')

      prepareBatch(stack, batch, function(err, jobs){
      	if(err) return done(err)

      	deployBatch(stack, jobs, function(err){
      		logger('[batch deployed] ' + stack.getId() + ' - ' + batch.length + ' jobs')
      		setTimeout(function(){
      			nextBatch(err)
      		}, 1000)
      	})	
      })

    }, function(err){

    	if(err){
    		console.log('ERROR')
    		console.log(err)
    		console.log('MUST DESTROY THE STACK NOW')
    		process.exit(1)
    	}
    	return done(err)
    })

	}

	function deployStack(stack, done){

		async.series([
		  function(next){
				prepareStack(stack, next)
		  },

		  function(next){
				loopStackBatches(stack, next)
		  }
		], done)

	}

	var dispatch =  {
		deployJob:deployJob,
		prepareJob:prepareJob,
		deployBatch:deployBatch,
		deployStack:deployStack
	}

	return dispatch
	
}
