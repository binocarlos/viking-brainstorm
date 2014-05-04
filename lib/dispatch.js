// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Container = require('./container')
var EventEmitter = require('events').EventEmitter

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
			console.log('PROC!')
			console.dir(data)
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

		function processProc(proc){

		}

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('planning')
		etcd.get('/proc', {
			recursive:true
		}, function(err, data){

			if(err){
				console.error(err)
				return
			}


			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.dir(data)

			finishPlan()

		})
		
		// loop over each thing in /proc

		// async map the proc onto the map to see if running

		// pick server to run jobs

		// deploy

		// record work done

		// if no work done do not re-plan

		// if work done then re-plan

	}

	dispatch.start = function(network, done){

		listenProcs()
		
		setTimeout(function(){
			done && done()	
		}, 100)
		
	}

	return dispatch

}