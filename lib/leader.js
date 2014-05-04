// the leader runs the registry and the git push
var utils = require('component-consoler');
var Network = require('./network')
var Schedule = require('./schedule')
var Dispatch = require('./dispatch')
var Registry = require('./services/registry')
var async = require('async')

// the leader is running on the etcd leader
// only one leader process in running on the network
// it resolves what to run where by linking:
//
// * /host - the list of servers on the network
// * /proc - the list of processes we should be running
// * /run - the list of processes that are actually running
//
module.exports = function(config, etcd){

	var network = Network(config, etcd)
	var dispatch = Dispatch(config, etcd, network)
	var schedule = Schedule(config, etcd)

	return {
		start:function(done){

			async.series([

				function(next){

					network.start(next)

				},

				function(next){

					dispatch.start(function(){
						setTimeout(next, 1000)
					})

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