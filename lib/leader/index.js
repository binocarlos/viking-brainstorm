// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var LeaderMonitor = require('./monitor')
var LeaderEvents = require('./events')

// the leader is running on the etcd leader
// only one leader process in running on the network
// it resolves what to run where by linking:
//
// * /host - the list of servers on the network
// * /proc - the list of processes we should be running
// * /run - the list of processes that are actually running
//

module.exports = function(config, etcd){

	// watch /proc and /hosts
	var eventBus = LeaderEvents(etcd)
	var leaderMonitor = LeaderMonitor(config, etcd)
	var vikingHostname = config.network.hostname

	var dispatch = new EventEmitter()
	var hosts = {}

	var started = false
	var active = false

	var planning = false
	var postPlan = false

	function getHostFromKey(key){
		return key.replace(/^\/host\//, '')
	}

	dispatch.plan = function(){
		if(!active){
			return
		}
		if(planning){
			postPlan = true
			return
		}
		planning = true

		function finishPlan(){
			setTimeout(function(){
				planning = false
				if(postPlan){
					postPlan = false
					dispatch.plan()
				}
			}, 500)
		}

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('LEADER PLAN')

		// the master planner
		/*
		Dowding(deployment, function(err, allocations){
			if(err || allocations.length){
				postPlan = true
				if(err) console.error(err)
			}
		})*/
	}

	dispatch.listen = function(done){
		if(started){
			return done && done()
		}
		started = true
		
		leaderMonitor.on('select', function(){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('leader elected')
			console.log(vikingHostname)

			dispatch.start(function(err){
				if(err){
					console.error('ERROR STARTING LEADER ' + err)
					return
				}
				
				utils.log('leader', 'running')
			})
		})

		leaderMonitor.on('deselect', function(){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('leader unelected')
			console.log(vikingHostname)

			dispatch.stop(function(err){
				if(err){
					console.error('ERROR STOPPING LEADER ' + err)
					return
				}
				
				utils.log('leader', 'stopped')
			})
		})


		eventBus.on('proc', function(){
			dispatch.plan()
		})

		eventBus.on('host', function(){
			dispatch.plan()
		})


		leaderMonitor.start()
		eventBus.listen()

		done && done()
	}

	dispatch.start = function(done){
		active = true
		
		setTimeout(function(){

			dispatch.plan()

			setTimeout(function(){
				done && done()
			}, 1000)
			
		}, 1000)
	}


	dispatch.stop = function(done){

		active = false
		
		return done()
		
	}

	return dispatch

}
