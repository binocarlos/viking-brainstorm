// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var exec = require('child_process').exec

var Deployment = require('../deployment')
var Job = require('../tools/job')
var Container = require('../tools/container')
var tools = require('../tools')
var Monitor = requiire('./monitor')
var SlaveEvents = require('./events')

module.exports = function(config, etcd){

	var hostname = config.network.hostname
	var ip = config.network.private

	var monitor = Monitor(config, etcd)

	var sink = new EventEmitter()

	var eventBus = SlaveEvents(etcd, hostname)
	var deployment = Deployment(config, etcd)


	var flattenResult = tools.flattenResult

	var isChecking = false
	var postCheck = false

	function processState(done){

		// this stuff handles never running a state allocation in parallel
		if(isChecking){
			postCheck = true
			return
		}

		isChecking = true
		var actionCount = 0

		function finishDeployment(){

			setTimeout(function(){
				isChecking = false
				if(actionCount>0){
					postCheck = true
				}
				if(postCheck){
					postCheck = false
					processState(done)
				}
				else{
					done && done()
				}
			}, 500)
			
		}

		deployment.getSlaveState(function(err, state){
			deployment.removeSlaveContainers(state, function(err, removeCount){
				if(err){
					utils.error(err)
				}
				if(removeCount){
					actionCount += removeCount
				}
				deployment.runSlaveContainers(state, function(err, addCount){
					if(err){
						utils.error(err)
					}
					if(addCount){
						actionCount += addCount
					}
					finishDeployment()
				})
			})
		})	
	}

	/*
	
		THIS IS WHERE CONTAINERS START
		
	*/
	

	sink.start = function(done){
		
		monitor.create(function(){
			monitor.start()
		})

		eventBus.on('deploy', function(){
			processState()
		})

		eventBus.listen()

		done()
		
	}

	return sink
}