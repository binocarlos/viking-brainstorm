var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var tools = require('../tools')
var Schedule = require('./schedule')
var logger = require('../tools/logger')

module.exports = function(config, etcd){

	var schedule = Schedule(config, etcd)

	// take an array of jobs and wait for them all to be run
	function deployBatch(batch, done){
		logger('[run batch and wait] ' + batch.length)
		
	}

	var dispatch =  {
		deployBatch:deployBatch
	}

	return dispatch
	
}
