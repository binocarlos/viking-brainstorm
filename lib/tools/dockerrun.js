var spawn = require('child_process').spawn;
var fs = require('fs');
var spawnargs = require('spawn-args');
var logger = require('./logger')
var socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
var stats  = fs.statSync(socket);

if (!stats.isSocket()) {
	logger.error('docker must be running');
	process.exit(1)
}

module.exports = function(opts){
	opts = opts || {};

	if(!opts.image){
		logger.error('image option required');
		process.exit(1)
	}

	var arr = [
		'-t'
	]

	if(!opts.id){
		throw new Error('id is required as part of the container')
	}

	if(opts.id){
		arr.push('--name')
		arr.push(opts.id.replace(/\//g, '-'))
	}

	if(opts.ports){
		opts.ports.forEach(function(p){
			arr.push('-p');
			arr.push(p);
		})
	}

	if(opts.volumes){
		opts.volumes.forEach(function(v){
			arr.push('-v');
			arr.push(v);
		})
	}

	if(opts.env){
		Object.keys(opts.env).forEach(function(k){
			arr.push('-e');
			arr.push(k + '=' + opts.env[k]);
		})
	}

	if(opts.entrypoint){
		arr.push('--entrypoint')
		arr.push(opts.entrypoint)
	}

	if(opts.cwd){
		arr.push('--workdir')
		arr.push(opts.cwd)
	}

	if(opts.dockerargs){
		arr = arr.concat(opts.dockerargs)
	}

	arr.push(opts.image);

	if(opts.command){
		arr = arr.concat(spawnargs(opts.command));
	}

	return arr
}