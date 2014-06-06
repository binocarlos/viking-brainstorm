// the leader runs the registry and the git push
var async = require('async')
var EventEmitter = require('events').EventEmitter
var spawn = require('child_process').spawn
var Monitor = require('./monitor')
var SlaveEvents = require('./events')
var logger = require('../tools/logger')

module.exports = function(config, etcd){

	var hostname = config.network.hostname
	var ip = config.network.private

	var monitor = Monitor(config, etcd)

	var sink = new EventEmitter()
	var eventBus = SlaveEvents(etcd, hostname)

	var isChecking = false
	var postCheck = false

	function processState(done){

		// this stuff handles never running a state allocation in parallel
		if(isChecking){
			postCheck = true
			return
		}

		isChecking = true

		function finishDeployment(){
			setTimeout(function(){
				isChecking = false
				if(postCheck){
					postCheck = false
					processState(done)
				}
				else{
					done && done()
				}
			}, 500)
			
		}

		var local = spawn('viking', [
			'slave2'
		])

		local.stdout.pipe(process.stdout)
		local.on('error', finishDeployment)
		local.on('close', finishDeployment)

	}

	/*
	
		THIS IS WHERE CONTAINERS START
		
	*/
	

	sink.start = function(done){
		
		monitor.create(function(){
			monitor.start()
		})

		eventBus.on('deploy', function(data){
			logger('[slave deploy event] ' + data.action + ' ' + data.node.key)
			processState(function(){
				processState()
			})
		})

		eventBus.listen()

		done()
		
	}

	return sink
}