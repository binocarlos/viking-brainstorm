var EventEmitter = require('events').EventEmitter;
var util = require('util');
var exec = require('child_process').exec
var Dockerrun = require('./dockerrun');
var wrench = require('wrench');
var async = require('async');

function Container(options, config){
	var self = this
	EventEmitter.call(this)

	if(typeof(options)=='string'){
		var parts = options.split('-')
		var stack = parts.shift()
		var name = parts.join('-')

		options = {
			stack:stack,
			name:name
		}
	}
	
	this._options = options
	
	var runoptions = JSON.parse(JSON.stringify(self._options))
	
	runoptions._name = runoptions.dockerName || runoptions.name
	runoptions.name = runoptions.stack + '-' + runoptions._name
	this._runoptions = runoptions

	this._name = runoptions.name
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
				self.remove(function(){
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
	this.data(function(err, data){
		if(err) return callback(err)
		if(!data) return callback()
		exec('docker rm ' + data.ID, function(err, stdout, stderr){
			if(err){
				return callback(err)
			}
			self.emit('removed')
			callback()
		})
	})
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

				exec('docker stop ' + data.ID, function(err, stdout, stderr){
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

Container.prototype.data = function(done){
	var self = this

	exec('docker inspect ' + this._name, function(err, stdout, stderr){
		if(err) return done()
		if(!stdout){
			return done()
		}
		var data = JSON.parse(stdout.toString())
		done(null, data[0])
	})

}

Container.prototype.ports = function(callback){
	var self = this

	self.data(function(err, data){
		if(err || !data){
			callback(err)
		}
		else{
			var ports = self._runoptions.ports || []

			callback(null, data)
		}
	})
	
}

module.exports = function(options, config){
	return new Container(options, config)
}