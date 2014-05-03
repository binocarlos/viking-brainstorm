// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Container = require('./container')
var EventEmitter = require('events').EventEmitter

module.exports = function(config, etcd){

	// watch /proc and /hosts

	var dispatch = new EventEmitter()

	dispatch.start = function(done){
/*
		etcd.get('/host', {
			recursive:true
		}, function(err, hosts){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('INITIAL HOSTS')
			console.dir(hosts)
		})*/

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

		etcd.wait('/host', {
			recursive:true
		}, function onHost(err, data, next){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('HOST!')
			console.dir(data)
			return next(onHost)
		})

		setTimeout(function(){
			done && done()	
		}, 100)
		
	}

	return dispatch
	

}