// the leader runs the registry and the git push
var utils = require('component-consoler');
var util = require('./tools/utils')
var async = require('async')

module.exports = function(etcd){

	return {

		// get the current running processes for a stack / name
		ps:function(stack, name, done){
			if(!done){
				done = name
				name = null
			}
			var parts = ['map', stack]
			if(name){
				parts.push(name)
			}
			var key = '/' + parts.join('/')
			etcd.get(key, {
				recursive:true
			}, function(err, results){
				console.log('-------------------------------------------');
				console.log('-------------------------------------------');
				console.log('ps results')
				console.dir(stack)
				console.dir(name)
				console.dir(err)
				console.dir(results)
			})
		}

	}

}