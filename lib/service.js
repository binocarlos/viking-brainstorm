var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Docker = require('./docker');
var Dockerrun = require('./dockerrun');
var wrench = require('wrench');

function Service(stack, name, options){
	EventEmitter.call(this);
	this._stack = stack;
	this._name = name;
	this._options = options;
	this._docker = Docker();
	Volume(stack, name);
}

util.inherits(Service, EventEmitter);

Service.prototype.start = function(callback){
	var self = this;
	this.isrunning(function(err, running){
		if(err){
			return callback(err);
		}
		if(running){
			return callback();
		}
		Dockerrun(self._options, callback);
	})
}

Service.prototype.isrunning = function(callback){
	this._docker.listContainers(function(err, containers){
		callback();
	})
}

module.exports = function(name, options){
	return new Service(name, options);
}