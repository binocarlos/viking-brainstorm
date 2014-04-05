var Docker = require('dockerode');
var utils = require('component-consoler');
var fs = require('fs');

var socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
var stats  = fs.statSync(socket);

if (!stats.isSocket()) {
	utils.fatal('docker must be running');
}

module.exports = function(opts){
	opts = opts || {};

	var docker = new Docker({socketPath: socket });

	return docker;
}