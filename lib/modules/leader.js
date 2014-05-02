// the leader runs the registry and the git push
var utils = require('component-consoler');
var Registry = require('../services/registry')
//var GitPush = require('./gitpush')
var async = require('async')

module.exports = function(config){
	return {
		start:function(done){

			async.series([
				function(next){
					var registry = Registry(config)

				  registry.on('running', function(){
				    utils.log('registry', 'already running')
				  })

				  registry.on('started', function(){
				    utils.log('registry', 'running')
				  })


				  registry.start(function(){
				    setTimeout(done, 1000)
				  })
				}

			], done)
			
		},
		stop:function(done){
			
			async.series([
				function(next){
					var registry = Registry(config)

				  registry.on('stopped', function(){
				    utils.log('registry', 'stopped')
				  })

				  registry.on('alreadystopped', function(){
				    utils.log('registry', 'already stopped')
				  })

				  registry.stop(function(){
				    setTimeout(done, 1000)
				  })
				}

			], done)
		}
	}
}