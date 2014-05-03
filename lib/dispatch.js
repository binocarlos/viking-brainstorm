// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Container = require('./container')
var EventEmitter = require('events').EventEmitter

module.exports = function(config, etcd){

	// watch /proc and /hosts

	var dispatch = new EventEmitter()
	var hosts = {}

	function getHostFromKey(key){
		return key.replace(/^\/host\//, '')
	}

	// the dowding function
	//
	// called when a host is added or a job is added to /proc
	function planner(done){

		// loop over each thing in /proc

		// async map the proc onto the map to see if running

		// pick server to run jobs

		// deploy

		// record work done

		// if no work done do not re-plan

		// if work done then re-plan

	}

	dispatch.start = function(done){

		// write jobs to /run
		etcd.wait('/proc', {
			recursive:true
		}, function onProc(err, data, next){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('PROC!')
			console.dir(data)
			return next(onProc)
		})

		etcd.get('/host', {
			recursive:true
		}, function(err, data){

			data.node.nodes.forEach(function(node){
				var key = getHostFromKey(node.key)
				hosts[key] = true
			})

		})

		etcd.wait('/host', {
			recursive:true
		}, function onHost(err, data, next){
			if(err){
				console.error(err)
				return
			}
			var hostname = getHostFromKey(data.node.key)
			if(data.action=='set'){
				hosts[hostname] = true
			}
			else if(data.action=='expire'){
				delete(hosts[hostname])
			}
			return next(onHost)
		})

		setTimeout(function(){
			done && done()	
		}, 100)
		
	}

	return dispatch
	

}