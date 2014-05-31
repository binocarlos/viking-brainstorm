// the leader runs the registry and the git push
var Stack = require('./deployment/stack')
var Stacks = require('./deployment/stacks')
var Deploy = require('./deployment/deploy')
var Server = require('./deployment/server')
var Job = require('./deployment/job')

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
	addApi(Server(config, etcd))
	addApi(Job(config, etcd))

	deployment.saveImage = function(path, value, done){
		etcd.set('/images/' + path, value, done)
	}


	return deployment
	
}
