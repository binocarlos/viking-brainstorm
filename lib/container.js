var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Docker = require('./docker');
var Dockerrun = require('./dockerrun');
var wrench = require('wrench');
var async = require('async');

function Container(options, config, etcd){
	var self = this
	EventEmitter.call(this)
	this._options = options
	this._docker = Docker()
	
	var runoptions = JSON.parse(JSON.stringify(self._options))
	runoptions._name = runoptions.name
	runoptions.name = runoptions.stack + '-' + runoptions._name
	this._runoptions = runoptions

	this._name = runoptions.name
	this._container = self._docker.getContainer(this._name)
	this._etcd = etcd
	this._config = config
}

util.inherits(Container, EventEmitter)

Container.prototype.arrive = function(callback){
	var self = this;
	if(!this._etcd){
		return callback()
	}
	this.data(function(err, data){
		if(err){
			return callback(err)
		}
		var id = data.ID
		var ip = self._config.network.private
		var ports = data.NetworkSettings.Ports

		var endpoints = Object.keys(ports || {}).map(function(key){
			var obj = ports[key]
			var parts = key.split('/')
			var containerPort = parts[0]
			var hostPort = obj.HostPort
			return {
				path:'/' + self._options.stack + '/' + self._options.name + '/' + containerPort + '/' + id,
				value:ip + ':' + hostPort
			}
		})


		/*
		
			HERE GOES THE AMABASSADOR THAT CHECKS HTTPS OR TCP (with telnet)

			THIS IS WHAT TTLS the key to etcd and keeps the ping going to HQ
			
		*/

		async.forEach(endpoints, function(endpoint, nextEndpoint){

		}, function(){

		})

		
		console.dir(ports)
		console.dir(self._options)
		console.dir(self._config)
		process.exit()

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('data')
		console.dir(data)
		process.exit()
	})
}


Container.prototype.leave = function(callback){
	if(!this._etcd){
		return callback()
	}
}

// run if there is no service already running
// if there is a dead container with this name then remove it first
Container.prototype.start = function(callback){
	var self = this

	function start(){
		Dockerrun(self._runoptions, function(){
			self.arrive(function(){
				self.emit('started')
				callback()	
			})
			
		});
	}

	this.data(function(err, data){
		if(err){
			callback(err)
		}
		else{
			if(data && data.State.Running){
				self.arrive(function(){
					self.emit('running')
					callback()
				})
			}
			else if(data){
				self._container.remove(function(){
					self.emit('removed')
					start()
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

module.exports = function(options, config, etcd){
	return new Container(options, config, etcd)
}