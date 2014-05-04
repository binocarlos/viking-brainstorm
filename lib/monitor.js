// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Container = require('./container')
var EventEmitter = require('events').EventEmitter
var util = require('util')

// keeps the entry in /host fresh
module.exports = function(config, etcd){
	
}