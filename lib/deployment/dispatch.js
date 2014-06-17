var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var tools = require('../tools')
var Allocations = require('./allocations')
var State = require('./state')
var Network = require('./network')
var Schedule = require('./schedule')
var logger = require('../tools/logger')

module.exports = function(config, etcd){

	var getState = State(config, etcd)
	var network = Network(config, etcd)
	var schedule = Schedule(config, etcd)

	function getAllocations(done){
		var self = this;
		getState(function(err, state){

			Allocations(etcd, state, done)

		})
	}

	function writeProcs(allocations, done){
		var self = this;
		if(allocations && allocations.length>0){
			logger('[write procs] ' + allocations.length)
			async.forEach(allocations, function(allocation, nextAllocation){

				schedule.runJob(allocation.job, allocation.server, nextAllocation)

			}, function(err){
				done(err, allocations)
			})
		}
		else{
			done()
		}
	}

	function runDispatch(done){
		logger('[run dispatch]')
		network.cleanServers(function(err){
			if(err) return done(err)
			getAllocations(function(err, allocations){
				if(err) return done(err)
				writeProcs(allocations, done)
			})
		})
	}

	var dispatch =  {
		run:runDispatch,
		writeProcs:writeProcs,
		getAllocations:getAllocations
	}

	return dispatch
	
}
