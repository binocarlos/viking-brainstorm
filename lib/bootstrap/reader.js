#!/usr/bin/env node
var utils = require('component-consoler');
var etcdjs = require('etcdjs')
var config = require('../config')()
var Deployment = require('../deployment')

module.exports = function(args){
  args = args || {}
  var etcd = etcdjs(config.network.etcd)
 
 	var deployment = Deployment(config, etcd)

 	deployment.processSlave(function(err, count){
 		console.log('actions: ' + count)
 	})
 
}
