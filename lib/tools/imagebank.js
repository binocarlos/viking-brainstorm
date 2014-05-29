// the leader runs the registry and the git push
var EventEmitter = require('events').EventEmitter

module.exports = function(config, etcd){

	// watch /proc and /hosts

	var imageBank = new EventEmitter()

	// make sure we dont sit in an endless loop trying to run a failing container
	imageBank.saveImage = function(path, value, done){
		etcd.set('/images/' + path, value, done)
	}


	// TODO - getImages - deleteImages

	return imageBank
	
}
