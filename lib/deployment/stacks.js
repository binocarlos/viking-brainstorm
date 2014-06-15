// the leader runs the registry and the git push
var async = require('async')
var Job = require('../tools/job')
var tools = require('../tools')
var flatten = require('etcd-flatten')
var endpoints = require('./endpoints')
var env = require('../tools/env')
var logger = require('../tools/logger')

module.exports = function(config, etcd){

	function checkExists(stack, done){
		var id = stack.getId()

		console.log('-------------------------------------------');
		console.dir(id)
		process.exit()
	}

	return {

		checkExists:checkExists

	}
}
