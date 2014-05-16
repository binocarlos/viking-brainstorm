// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var Job = require('./job')
var Server = require('./server')
var tools = require('./tools')
var flatten = require('etcd-flatten')

module.exports = function(config, etcd){

	// watch /proc and /hosts

	var imageBank = new EventEmitter()

	// make sure we dont sit in an endless loop trying to run a failing container
	imageBank.saveImage = function(path, done){
		etcd.set('/images/' + path, '', done)
	}


	// TODO - getImages - deleteImages

	return imageBank
	
}
