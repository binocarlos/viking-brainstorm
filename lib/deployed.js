// the leader runs the registry and the git push
var utils = require('component-consoler');
var tools = require('./tools')
var async = require('async')

module.exports = function(config, etcd){

	return {

		// get the current running processes for a stack / name
		ps:function(job, done){
			var key = util.jobKey('map', job)
			etcd.get(key, {
				recursive:true
			}, function(err, results){
				done(err, results || [])
			})
		}

	}

}