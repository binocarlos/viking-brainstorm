// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var Container = require('./container')
var Deployment = require('./deployment')
var Monitor = require('./sinkmonitor')

module.exports = function(config, etcd){

	//var deployment = Deployment(config, etcd)
	var monitor = Monitor(config, etcd)


	function runJob(job, done){
		var container = Container(job)

	  container.on('running', function(){
	    utils.log('sink', 'running: ' + job.name)
	  })

	  container.on('started', function(){
	    utils.log('sink', 'started: ' + job.name)
	  })

	  container.start(function(){
	    setTimeout(done, 10)
	  })
	}

	var sink = new EventEmitter()


	function processDeployment(deployment){
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('INITIAL DEPLOY')
		console.dir(err)
		console.log(JSON.stringify(data, null, 4))
	}

	sink.start = function(done){

		monitor.start(done)
		
	}

	return sink
}