// the leader runs the registry and the git push
var async = require('async')
var EventEmitter = require('events').EventEmitter
var LeaderMonitor = require('./monitor')
var LeaderEvents = require('./events')
var spawn = require('child_process').spawn
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

		var dispatcher = spawn('viking', [
			'dispatch'
		], {
			stdio:'inherit'
		})

		dispatcher.on('error', finishPlan)
		dispatcher.on('close', finishPlan)
		
	}


	dispatch.listen = function(done){
		if(started){
			return done && done()
		}
		
		started = true
		
		leaderMonitor.on('change', function(value){
			console.log('[leader] ' + value)
		})

		leaderMonitor.on('select', function(){
			console.log('[leader elected] ' + vikingHostname)
			active = true
			dispatch.plan()
		})

		leaderMonitor.on('deselect', function(){
			console.log('[leader unelected] ' + vikingHostname)
			active = false
		})


		eventBus.on('proc', function(data){
			console.log('[proc event]')
			console.dir(data.action + ' ' + data.node.key)
			dispatch.plan()
		})

		eventBus.on('host', function(data){
			if(!data){
				return
			}
			console.log('[host event]')
			if(data.action=='set'){
				if(data.node.key.match(/\/config$/)){
					console.log('set: ' + data.node.key)
				}
				dispatch.plan()
			}
			else{
				console.log(data.action + ' ' + data.node.key)
			}
		})


		leaderMonitor.start()
		eventBus.listen()

		done && done()
	}

	dispatch.start = function(done){
		active = true
		return done()
	}


	dispatch.stop = function(done){

		active = false
		
		return done()
		
	}

	return dispatch

}
