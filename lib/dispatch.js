// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Container = require('./container')
var EventEmitter = require('events').EventEmitter
var Dowding = require('./dowding')

module.exports = function(config, etcd, network, deployment){

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
			setTimeout(function(){
				planning = false
				if(postPlan){
					postPlan = false
					dispatch.plan()
				}
			}, 500)
		}

		// the master planner
		Dowding(etcd, network, function(err, allocations){
			if(err){
				postPlan = true
				console.error(err)
			}

			if(allocations && allocations.length>0){

				console.log('-------------------------------------------');
				console.log('-------------------------------------------');
				console.log('RUN ALLOCATIONS')
				console.dir(allocations)
				postPlan = true

				async.forEach(allocations, function(allocation, nextAllocation){

					deployment.runJob(allocation.job, allocation.server, nextAllocation)

				}, function(err){
					if(err){
						postPlan = true
						console.error(err)
					}
					finishPlan()
				})
			}
			else{
				finishPlan()
			}
			
		})
	}

	dispatch.start = function(done){

		listenProcs()
		
		setTimeout(function(){

			dispatch.plan()

			setTimeout(function(){
				done && done()
			}, 1000)
			
		}, 1000)
		
	}

	network.on('add', function(host, data){
		utils.log('add host', host)
		dispatch.plan()
	})

	network.on('update', function(host, data){
		//utils.log('update host', host)
		//dispatch.plan()
	})

	network.on('remove', function(host){
		utils.log('remove host', host)
		deployment.removeServer(host, function(err){
			dispatch.plan()	
		})
		
	})

	return dispatch

}
