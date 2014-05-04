// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Container = require('./container')
var EventEmitter = require('events').EventEmitter
var Dowding = require('./dowding')

module.exports = function(config, etcd, network){

	// watch /proc and /hosts

	var dispatch = new EventEmitter()
	var hosts = {}

	function getHostFromKey(key){
		return key.replace(/^\/host\//, '')
	}

	function listenProcs(){

		// write jobs to /run
		etcd.wait('/proc', {
			recursive:true
		}, function onProc(err, data, next){
			if(!data){
				return next(onProc)
			}
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('procs change plan')
			dispatch.plan()
			return next(onProc)
		})
	}

	var planning = false
	var postPlan = false

	// the dowding function
	//
	// called when a host is added or a job is added to /proc
	dispatch.plan = function(){
		if(planning){
			postPlan = true
			return
		}
		planning = true

		function finishPlan(){
			planning = false
			if(postPlan){
				postPlan = false
				dispatch.plan()
			}
		}

		var procs = {}
		var runs = {}

		function processProc(proc){
			if(!proc){
				return
			}
			if(proc.dir){
				proc.nodes.forEach(processProc)
			}
			else{
				procs[proc.key.replace(/^\/proc/, '')] = JSON.parse(proc.value)
			}
		}

		function processRun(run){
			if(!run){
				return
			}
			if(run.dir){
				run.nodes.forEach(processRun)
			}
			else{
				runs[run.key.replace(/^\/run/, '')] = JSON.parse(run.value)
			}
		}

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('planning')

		async.parallel({
			proc:function(next){
				etcd.get('/proc', {
					recursive:true
				}, function(err, data){
					if(err){
						return next(err)
					}
					if(!data){
						return next();
					}
					next(null, data.node)
				})
			},
			run:function(next){
				etcd.get('/run', {
					recursive:true
				}, function(err, data){
					if(err){
						return next()
					}
					if(!data){
						return next();
					}
					next(null, data.node)
				})
			}
		}, function(err, data){
			if(err){
				console.error(err)
				return
			}

			processProc(data.proc)
			processRun(data.run)

			var runJobs = []

			Object.keys(procs || {}).forEach(function(key){
				if(!runs[key]){
					runJobs.push(procs[key])
				}
			})

			if(runJobs.length){
				Dowding(runJobs, etcd, network, function(err){
					if(err){
						console.error(err)
						return
					}
					console.log('-------------------------------------------');
					console.log('jobs are run')
					finishPlan()
				})
			}

		})

	}

	dispatch.start = function(done){

		listenProcs()
		
		setTimeout(function(){

			dispatch.plan()

			setTimeout(function(){
				done && done()
			}, 100)
			
		}, 100)
		
	}

	return dispatch

}
