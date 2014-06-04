// this runs on all vikings with an etcd client to listen for events
var exec = require('child_process').exec
var async = require('async')
var config = require('../config')()
var prompt = require('prompt-for')

module.exports = function(opts){

	var configure = {
		boot:function(done){

			console.dir(config)
		}
		
	}
	return configure	
}
