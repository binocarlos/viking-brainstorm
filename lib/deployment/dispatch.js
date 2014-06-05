// the leader runs the registry and the git push
var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var tools = require('../tools')
var Allocations = require('./allocations')
var State = require('./state')
var Network = require('./network')
var Schedule = require('./schedule')

// Because planning - Hugh Dowding (in case you were wandering)
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
		console.log('[clean servers]')
		network.cleanServers(function(err){
			if(err) return done(err)
			console.log('[get allocations]')
			getAllocations(function(err, allocations){
				if(err) return done(err)
				console.log('[write procs]')
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
