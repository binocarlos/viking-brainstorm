// the leader runs the registry and the git push
var utils = require('component-consoler');
var Schedule = require('./schedule')
var Dispatch = require('./dispatch')
var Registry = require('./services/registry')
//var GitPush = require('./gitpush')
var async = require('async')

module.exports = function(config, etcd){

	var dispatch = Dispatch(config, etcd)
	var schedule = Schedule(config, etcd)

	return {
		start:function(done){

			async.series([

				function(next){

					dispatch.start(next)

				},

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