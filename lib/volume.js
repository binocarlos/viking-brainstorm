var EventEmitter = require('events').EventEmitter;
var util = require('util');
var wrench = require('wrench');

var folder = process.env.VIKING_ROOT || '/var/run/viking/volumes';

module.exports = function(stack, name){
	wrench.mkdirSyncRecursive([folder, stack, name].join('/'), 0777);
}