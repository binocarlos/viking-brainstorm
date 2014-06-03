var EventEmitter = require('events').EventEmitter;
var util = require('util');
var exec = require('child_process').exec
var Dockerrun = require('./dockerrun');
var wrench = require('wrench');
var async = require('async');

function Container(job){
	var self = this
	EventEmitter.call(this)

	if(typeof(job)=='string'){
		var parts = job.split('-')
		var stack = parts.shift()
		var tag = parts.shift()
		var name = parts.shift()

		job = {
			stack:stack,
			tag:tag,
			name:name,
			id:job
		}
	}
	
	this._job = job
	this._id = job.id

	var runoptions = JSON.parse(JSON.stringify(self._job))

	this._runoptions = runoptions
}

util.inherits(Container, EventEmitter)

// return a readable stream
Container.prototype.attach = function(){
	throw new Error('TBC')
}

Container.prototype.options = function(){
	return this._runoptions
}

Container.prototype.isStream = function(){
	if(this._runoptions.deamon || this._runoptions.deamonize){
		return false
	}
	else{
		return true
	}
}

Container.prototype.checkRunning = function(opts, callback){

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

// run a container in interactive mode
// return a the spawned process in pipe mode
// trigger -i and --rm on the docker container
Container.prototype.stream = function(){
	var self = this

	var args = Dockerrun(self.options())

	args = ['run', '-i', '--rm'].concat(args)

	return spawn('docker', args, {
		stdio: 'pipe'
	})
}

Container.prototype.deamon = function(callback){
	var self = this

	var args = Dockerrun(self.options())

	args = ['run', '-d'].concat(args)

	var command = 'docker ' + args.join(' ')

	exec(command, function(err, stdout, stderr){
		if(err || stderr){
			return callback(err || stderr.toString())
		}
		console.log(stdout.toString())
		callback(null, stdout.toString())
	})
	
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
			self.data(callback)
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

	exec('docker inspect ' + this._id, function(err, stdout, stderr){
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
			var ports = self.options().ports || []
			callback(null, data)
		}
	})
	
}

module.exports = function(job){
	return new Container(job)
}