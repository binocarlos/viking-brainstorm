var yaml = require('js-yaml')
var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var VikingFile = require('./vikingfile')
var async = require('async');

function Stack(dir, opts){
	EventEmitter.call(this);
	this.dir = dir
	this.options = opts || {}
	this.configpath = path.normalize(this.dir + '/' + (this.options.config || 'viking.yml'))

	this.vikingfile = VikingFile(this.configpath, this.options)
}

util.inherits(Stack, EventEmitter);

Stack.prototype.build = function(done){
	this.vikingfile.load(done)
}

Stack.prototype.test = function(done){
	done()
}

Stack.prototype.run = function(done){
	this.vikingfile.load(done)
	
}

Stack.prototype.dev = function(done){
	var self = this;

	async.series([
		function(next){
			self.vikingfile.load(next)
		},

		function(next){
			self.vikingfile.development(self.dir)
			console.log('-------------------------------------------');
			console.log(JSON.stringify(self.vikingfile.data.images, null, 4));
			
		},

		function(next){

		}
	], done)
	
}

module.exports = function(dir, config){
	return new Stack(dir, config)
}