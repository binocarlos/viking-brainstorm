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

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('planning')

		Dowding(etcd, network, function(err){
			if(err){
				console.error(err)
			}
			finishPlan()
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

	network.on('add', function(host, data){
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('add host plan')
		dispatch.plan(network)
	})

	network.on('update', function(host, data){
		//dispatch.plan()
	})

	network.on('remove', function(host){
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('remove host plan')
		dispatch.plan()
	})

	return dispatch

}
