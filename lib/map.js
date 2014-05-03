// the leader runs the registry and the git push
var utils = require('component-consoler');
var util = require('./tools/utils')
var async = require('async')

module.exports = function(etcd){

	return {

		// get the current running processes for a stack / name
		ps:function(job, done){
			var key = utils.jobKey('map', job)
			etcd.get(key, {
				recursive:true
			}, function(err, results){
				done(err, results || [])
			})
		}

	}

}