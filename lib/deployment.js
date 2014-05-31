// the leader runs the registry and the git push
var Stack = require('./deployment/stack')
var Stacks = require('./deployment/stacks')
var Deploy = require('./deployment/deploy')
var Network = require('./deployment/network')
var Job = require('./deployment/job')
var State = require('./deployment/state')

module.exports = function(config, etcd){

	// watch /proc and /hosts
	var deployment = new EventEmitter()

	function addApi(api){
		Object.keys(api || {}).forEach(function(key){
			deployment[key] = api[key]
		})
	}

	addApi(Stack(config, etcd)))
	addApi(Stacks(config, etcd))
	addApi(Deploy(config, etcd))
	addApi(Network(config, etcd))
	addApi(Job(config, etcd))
	addApi(State(config, etcd))

	deployment.saveImage = function(path, value, done){
		etcd.set('/images/' + path, value, done)
	}

	return deployment	
}
