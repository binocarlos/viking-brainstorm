// the leader runs the registry and the git push
var utils = require('component-consoler');
var Schedule = require('./schedule')
var Registry = require('./services/registry')
//var GitPush = require('./gitpush')
var async = require('async')

module.exports = function(config, etcd){

	var monitorTimeout = null
	var schedule = Schedule(etcd)

	return {
		start:function(done){

			async.series([
				function(next){

					schedule.ensure(Registry(config), next)

				}

			], done)
			
		},
		stop:function(done){
			
			async.series([
				function(next){

					
				}

			], done)
		}
	}
}