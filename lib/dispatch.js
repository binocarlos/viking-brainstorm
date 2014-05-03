// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Container = require('./container')

module.exports = function(etcd, config){

	// watch /proc and /hosts

	// write jobs to /run
	etcd.watch('/proc', {
		recursive:true
	}, function(err, data, next){
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('PROC!')
		console.dir(data)
		next()
	})

	etcd.watch('/hosts', {
		recursive:true
	}, function(err, data, next){
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('HOST!')
		console.dir(data)
		next()
	})

}