// the leader runs the registry and the git push
var async = require('async')
var Job = require('../tools/job')
var tools = require('../tools')
var flatten = require('etcd-flatten')
var endpoints = require('./endpoints')
var env = require('../tools/env')
var logger = require('../tools/logger')

module.exports = function(config, etcd){

	function loadTags(name, done){
		etcd.get('/stack/' + name + '/tags', {
			recursive:true
		}, function(err, result){
			if(err) return done(err)
			if(!result) return done('no data')

			result = flatten(result.node)

			done(null, result)
		})
	}

	function loadDeploys(name, done){
		etcd.get('/stack/' + name + '/deploys', {
			recursive:true
		}, function(err, result){
			if(err) return done(err)
			if(!result) return done('no data')

			result = flatten(result.node)

			done(null, result)
		})
	}

	function writeStack(stack, done){
		var packet = JSON.stringify(stack.getData())
		etcd.set('/stack/' + stack.id + '/tags/' + stack.tag, packet, done)
	}

	function checkExists(stack, done){

		loadTags(stack.id, function(err, result){
			if(result){
				done(null, result)
			}
			else{
				done()
			}
		})
		
	}

	return {

		checkExists:checkExists,
		writeStack:writeStack

	}
}
