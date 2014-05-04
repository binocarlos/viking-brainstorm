var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Docker = require('./docker');
var Dockerrun = require('./dockerrun');
var wrench = require('wrench');
var async = require('async');

function Container(options, config){
	var self = this
	EventEmitter.call(this)
	this._options = options
	this._docker = Docker()
	
	var runoptions = JSON.parse(JSON.stringify(self._options))
	runoptions._name = runoptions.dockerName || runoptions.name
	runoptions.name = runoptions.stack + '-' + runoptions._name
	this._runoptions = runoptions

	this._name = runoptions.name
	this._container = self._docker.getContainer(this._name)
	this._config = config
}

util.inherits(Container, EventEmitter)

// run if there is no service already running
// if there is a dead container with this name then remove it first
Container.prototype.start = function(callback){
	var self = this

	function start(data){
		Dockerrun(self._runoptions, function(){
			self.emit('started')

			self.data(function(err, data){
				callback(err, data)
			})
			
		})
	}

	this.data(function(err, data){
		if(err){
			callback(err)
		}
		else{
			if(data && data.State.Running){
				self.emit('running')
				callback(null, data)
			}
			else if(data){
				self._container.remove(function(){
					self.emit('removed')
					start(data)
				})
			}
			else{
				start()
			}
		}
	})
}

Container.prototype.reset = function(callback){
	var self = this;
	(this._options.volumes || []).forEach(function(v){
		var parts = v.split(':')
		wrench.rmdirSyncRecursive(parts[0], true)
		self.emit('reset', parts[0])
	})
	callback()
}


Container.prototype.remove = function(callback){
	var self = this
	this._container.remove(function(err){
		if(err){
			return callback(err)
		}
		self.emit('removed')
		callback()
	});
}

Container.prototype.stop = function(remove, callback){
	var self = this
	if(arguments.length<=1){
		callback = remove
		remove = null
	}
	this.data(function(err, data){
		if(err){
			callback(err)
		}
		else{
			if(data && data.State.Running){
				self._container.stop(function(err){
					if(err){
						callback(err)
					}
					self.emit('stopped')

					if(remove){
						self.remove(callback)
					}
					else{
						callback()
					}
					
				})
			}
			else if(data){
				self.emit('alreadystopped')
				if(remove){
					self.remove(callback)
				}
				else{
					callback()
				}
				
			}
			else{
				self.emit('alreadystopped')
				callback()
			}
		}
	})
}

Container.prototype.data = function(callback){
	var self = this
	
	this._container.inspect(function(err, data){
		if(err || !data){
			callback(null, false)
		}
		else{
			callback(null, data)
		}
	})
}

module.exports = function(options, config){
	return new Container(options, config)
}