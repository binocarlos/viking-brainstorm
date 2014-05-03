// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Container = require('./container')

module.exports = function(etcd, config){

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

	
	// listen to etcd /run/hostid for jobs to run

}