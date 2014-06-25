var EventEmitter = require('events').EventEmitter;
var util = require('util');
var exec = require('child_process').exec
var spawn = require('child_process').spawn
var Dockerrun = require('./dockerrun');
var concat = require('concat-stream')
var wrench = require('wrench');
var async = require('async');

var Job = require('./job')
var Volume = require('./volume')
var logger = require('./logger')
var Endpoints = require('../deployment/endpoints')
var CombineStream = require("combine-stream")
var stamp = require('stamp-stream')

function Container(job){
	var self = this
	EventEmitter.call(this)

	if(typeof(job)=='string'){
		job = Job.fromKey(job)._data
	}

	this._job = job
	this._id = job.id
	this._containerid = (job.id || '').replace(/\//g, '-')
}

util.inherits(Container, EventEmitter)

Container.prototype.id = function(){
	return this._containerid
}

// return a readable stream
Container.prototype.attach = function(){
	throw new Error('TBC')
}

Container.prototype.options = function(){
	var self = this;
	return JSON.parse(JSON.stringify(self._job))
}

Container.prototype.isStream = function(){
	if(this.options().deamon || this.options().deamonize){
		return false
	}
	else{
		return true
	}
}

Container.prototype.checkRunning = function(opts, callback){

	var self = this;
	if(!callback){
		callback = opts
		opts = {}
	}
	
	this.data(function(err, data){
		if(err){
			callback(err)
		}
		else{
			if(data && data.State.Running){
				callback(null, true)
			}
			else if(data && opts.clean){
				self.remove(function(){
					self.emit('removed')
					callback(null, false)
				})
			}
			else{
				callback(null, false)
			}
		}
	})
}

Container.prototype.combineStream = function(proc){
	var stdout = stamp('[stdout] ')
	var stderr = stamp('[stdout] ')

	proc.stdout.pipe(stdout)
	proc.stderr.pipe(stderr)

	return new CombineStream([stdout, stderr])
}


// run a container in interactive mode
// return a the spawned process in pipe mode
// trigger -i and --rm on the docker container
Container.prototype.stream = function(){
	var self = this

	var args = Dockerrun(self.options())

	args = ['run', '-i', '--rm'].concat(args)

	var stream = spawn('docker', args, {
		stdio: 'pipe'
	})

	this.emit('stream', this.combineStream(stream))

	return stream
}

Container.prototype.run = function(done){
	var self = this

	var args = Dockerrun(self.options())

	args = ['run', '--rm'].concat(args)

	logger('[docker] ' + args.join(' '))

	var stream = spawn('docker', args, {
		stdio: 'pipe'
	})

	this.emit('stream', this.combineStream(stream))
	
	stream.on('close', done)
	stream.on('error', done)
	
	return stream

/*
	exec('docker ' + args.join(' '), function(err, stdout, stderr){
		done(err || stderr.toString(), stdout.toString())
	})
*/
}

Container.prototype.deamon = function(done){
	var self = this

	var args = Dockerrun(self.options())

	args = ['run', '-d'].concat(args)

	var command = 'docker ' + args.join(' ')

	logger('[docker deamon] ' + command)

	var stream = spawn('docker', args, {
		stdio: 'pipe'
	})

	this.emit('stream', this.combineStream(stream))
	
	stream.on('close', function(exitCode){
		done(exitCode ? 'process error ' + exitCode : null)
	})
	stream.on('error', done)

	return stream

/*
	exec(command, function(err, stdout, stderr){
		if(err || stderr){
			return callback(err || stderr.toString())
		}
		logger('[docker deamon output] [stdout]')
		console.log(stdout.toString())
		console.log('[/stdout]')
		callback(null, stdout.toString())	
	})
	*/
}

// run a container in Deamon mode
// this checks to see if there is not one already running
Container.prototype.start = function(opts, callback){
	var self = this

	if(!callback){
		callback = opts
		opts = {}
	}

	this.checkRunning({
		clean:true
	}, function(err, running){

		if(err){
			return callback(err)
		}

		if(running){
			self.emit('running')
			return callback('already running')
		}

		self.deamon(function(err){
			if(err){
				return callback(err)
			}
			// let the container get going and then determine its status
			setTimeout(function(){
				self.data(function(err, data){

					if(err) return callback(err)
					var State = data.State

					if(State.ExitCode==1 || !State.Running){
						self.remove(function(){
							exec('docker logs ' + self._id, function(err, stdout, stderr){
								var logs = stdout.toString()
								callback(logs)
							})
						})
						return
					}
					else{
						return callback(null, data)	
					}
				})	
			}, 2000)
			
		})
	})

}

Container.prototype.reset = function(callback){
	var self = this;
	(this._job.volumes || []).forEach(function(v){
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

		var id = data.ID || data.Id
		if(!id){
			return callback('no id for container')
		}
		logger('[docker remove] ' + id)
		exec('docker rm ' + id, function(err, stdout, stderr){
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

				var id = data.ID || data.Id
				if(!id){
					return callback('no id for container')
				}
				logger('[docker stop] ' + id)
				exec('docker stop ' + id , function(err, stdout, stderr){
					if(err){
						callback(err)
						return
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
	exec('docker inspect ' + this._containerid, function(err, stdout, stderr){
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
			var ports = data.NetworkSettings.Ports

			var ret = {}
			Object.keys(ports || {}).forEach(function(key){
				var info = ports[key]
				ret[key] = info[0].HostPort
			})

			callback(null, ret)
		}
	})
	
}

module.exports = function(job){
	return new Container(job)
}