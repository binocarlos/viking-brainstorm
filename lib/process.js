var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Dockerrun = require('./dockerrun');
var wrench = require('wrench');
var async = require('async');
var path = require('path');
var spawn = require('child_process').spawn
var exec = require('child_process').exec
var spawnargs = require('spawn-args');
var fs = require('fs');
function Process(options){
	var self = this;
	EventEmitter.call(this);
	this._options = options;
	
	if(!this._options.name){
		throw new Error('process requires name option')
	}

	if(!this._options.system.pids){
		throw new Error('process requires system.pids option')
	}

	if(!this._options.system.logs){
		throw new Error('process requires system.logs option')
	}
}

util.inherits(Process, EventEmitter);

Process.prototype.files = function(){
	return {
		pid:this._options.system.pids + '/' + this._options.name + '.pid',
		monpid:this._options.system.pids + '/' + this._options.name + '.mon.pid',
		log:this._options.system.logs + '/' + this._options.name + '.log'
	}
}

Process.prototype.start = function(done){
	var self = this;

	var files = this.files()

	if(fs.existsSync(files.monpid)){
		this.emit('running')
		return done()
	}
	
	var opts = {
		cwd:path.normalize(__dirname + '/..')
	}

	var args = ['-l', files.log, '-p', files.pid, '-m', files.monpid, '-d', this._options.cmd]
	opts.detached = true
	spawn('mon', args, opts)
	this.emit('started')
	done()
}

Process.prototype.stop = function(done){
	var self = this;
	
	var files = this.files()

	if(!fs.existsSync(files.monpid)){
		this.emit('alreadystopped')
		return done()
	}

	var monpid = fs.readFileSync(files.monpid, 'utf8')
	var nodepid = fs.readFileSync(files.pid, 'utf8')

	/*
	
		VERY BAD - this means we cannot have multiple mon
		processes

		this is sort of OK cos we should be running everything
		in docker anyways but still
		
	*/
	exec('sudo killall mon', function(err, stdout, stderr){
		async.forEach([
			files.monpid,
			files.pid
		], function(file, nextfile){
			fs.unlink(file, nextfile)
		}, function(){
			self.emit('stopped')
			done()
		})
	})
}

module.exports = function(options){
	return new Process(options);
}