// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter

module.exports = function(config, etcd){

	var monitor = new EventEmitter()

	function listenFailed(){

		etcd.wait('/failed', {
			recursive:true
		}, function onFailed(err, data, next){
			if(!data){
				return next(onFailed)
			}

			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('FAILED!!!!')

			console.dir(data)
			return next(onFailed)
		})
	}

	monitor.start = function(done){

		listenFailed()
		
		done()
		
	}

	return monitor
}