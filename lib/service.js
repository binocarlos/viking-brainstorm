var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Docker = require('./docker');
var Dockerrun = require('./dockerrun');
var wrench = require('wrench');
var async = require('async');

function Service(options){
	var self = this;
	EventEmitter.call(this);
	this._options = options;
	this._docker = Docker();
	var runoptions = JSON.parse(JSON.stringify(self._options));
	runoptions._name = runoptions.name;
	runoptions.name = runoptions.stack + '-' + runoptions._name;
	this._runoptions = runoptions;
	this._name = runoptions.name;
	this._container = self._docker.getContainer(this._name);
}

util.inherits(Service, EventEmitter);

// run if there is no service already running
// if there is a dead container with this name then remove it first
Service.prototype.start = function(callback){
	var self = this;
	
	function start(){
		Dockerrun(self._runoptions, function(){
			self.emit('started');
			callback();
		});
	}

	this.data(function(err, data){
		if(err){
			callback(err);
		}
		else{
			if(data && data.running){
				self.emit('running');
				callback();
			}
			else if(data){
				self._container.remove(function(){
					self.emit('removed');
					start();
				})
			}
			else{
				start();
			}
		}
	})
}

Service.prototype.data = function(callback){
	var self = this;
	
	this._container.inspect(function(err, data){
		if(err || !data){
			callback(null, false);
		}
		else{
			callback(null, data);
		}
	})
}

module.exports = function(name, options){
	return new Service(name, options);
}