// the leader runs the registry and the git push
var utils = require('component-consoler');
var Network = require('./network')
var Schedule = require('./schedule')
var Dispatch = require('./dispatch')
var Deployed = require('./deployed')
var Registry = require('./services/registry')
var async = require('async')

module.exports = function(config, etcd){

	var network = Network(config, etcd)
	var deployed = Deployed(config, etcd)
	var dispatch = Dispatch(config, etcd, network)
	var schedule = Schedule(config, etcd, deployed)

	network.on('add', function(host, data){
		console.log('-------------------------------------------');
		console.log('ADD HOST')
		console.dir(host)
		console.dir(data)
		dispatch.plan(network)
	})

	network.on('update', function(host, data){
		console.log('-------------------------------------------');
		console.log('UPDATE HOST')
		console.dir(host)
		console.dir(data)
		dispatch.plan()
	})

	network.on('remove', function(host){
		console.log('-------------------------------------------');
		console.log('REMOVE HOST')
		console.dir(host)
		dispatch.plan()
	})

	return {
		start:function(done){

			async.series([

				function(next){

					network.start(next)

				}/*,

				function(next){

					dispatch.start(network, next)

				},

				function(next){

					schedule.ensure(Registry(config), next)

				}*/

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