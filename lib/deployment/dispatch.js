var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var tools = require('../tools')
var Allocations = require('./allocations')
var State = require('./state')
var Network = require('./network')
var Schedule = require('./schedule')
var logger = require('../tools/logger')
var Log = require('./log')

module.exports = function(config, etcd){

	var getState = State(config, etcd)
	var network = Network(config, etcd)
	var schedule = Schedule(config, etcd)
	var log = Log(config, etcd)

	function getAllocations(done){
		var self = this;
		getState(function(err, state){

			Allocations(etcd, state, done)

		})
	}

	// we have allocated jobs to servers - write them to the schedule
	function writeProcs(allocations, done){
		var self = this;
		if(allocations && allocations.length>0){
			logger('[write allocataions] ' + allocations.length)
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

	// write the jobs that were not allocated to the log so we know that it failed
	function writeFails(allocations, done){
		var self = this;
		if(allocations && allocations.length>0){
			logger('[fail allocations] ' + allocations.length)
			async.forEach(allocations, function(job, nextAllocation){

				log.delayContainer(job, nextAllocation)

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
			getAllocations(function(err, allocations, failed){
				if(err) return done(err)
				writeProcs(allocations, function(err){
					if(err) return done(err)
					writeFails(failed, done)
				})
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
