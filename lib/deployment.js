// the leader runs the registry and the git push
var EventEmitter = require('events').EventEmitter
var Stack = require('./deployment/stack')
var Stacks = require('./deployment/stacks')
var Network = require('./deployment/network')
var Job = require('./deployment/job')
var State = require('./deployment/state')
var Slave = require('./deployment/slave')
var Allocate = require('./deployment/allocate')

module.exports = function(config, etcd){

	// watch /proc and /hosts
	var deployment = new EventEmitter()

	function addApi(api){
		Object.keys(api || {}).forEach(function(key){
			deployment[key] = api[key]
		})
	}

	addApi(Stack(config, etcd))
	addApi(Stacks(config, etcd))
	addApi(Network(config, etcd))
	addApi(Job(config, etcd))
	addApi(State(config, etcd))
	addApi(Slave(config, etcd))
	addApi(Allocate(config, etcd))

	return deployment	
}
