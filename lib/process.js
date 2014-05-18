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

	function runProg(){
		var opts = {
			cwd:path.normalize(__dirname + '/..')
		}
		var args = ['-l', files.log, '-p', files.pid, '-m', files.monpid, '-d', self._options.cmd]
		opts.detached = true
		spawn('mon', args, opts)
		self.emit('started')
		done()
	}

	function cleanUp(){
		fs.unlinkSync(files.monpid)
		fs.unlinkSync(files.pid)
		return runProg()
	}

	var files = this.files()

	// the pid file exists for the process
	// checks its actually running before saying so
	if(fs.existsSync(files.monpid)){
		var pid = fs.readFileSync(files.monpid)
		exec('ps -A | grep ' + pid, function(err, stdout, stderr){
			if(err || !stdout){
				cleanUp()
			}
			else{
				if(stdout.indexOf(pid)>=0){
					self.emit('running')
					return done()
				}
				else{
					cleanUp()
				}
			}
		})
	}
	else{
		return runProg()
	}
	
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

	async.series([
	  function(next){

	  	console.log('-------------------------------------------');
			console.log('KILL monpid ' + monpid)
			exec('sudo kill -9 ' + monpid, function(err, stdout){
				setTimeout(next, 100)
			})

	  },
	  function(next){

	  	

			if(!nodepid){
				return next()
			}


			/*
			
				HACK ALERT - why the pid has 1 added to I dont know
				perhaps mon restarts it again or suttin
				
			*/

			nodepid = parseInt(nodepid)
			nodepid++
			console.log('-------------------------------------------');
			console.log('KILL node ' + nodepid)
	  	exec('sudo kill -9 ' + nodepid, function(err, stdout){
				setTimeout(next, 100)
			})

	  },
	  function(next){
	  	async.forEach([
				files.monpid,
				files.pid
			], function(file, nextfile){
				fs.unlink(file, nextfile)
			}, next)
	  }
	], function(err){
		self.emit('stopped')
		done()
	})
}

module.exports = function(options){
	return new Process(options);
}