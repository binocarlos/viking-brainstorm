#!/usr/bin/env node
var utils = require('component-consoler');
var etcdjs = require('etcdjs')
var config = require('../config')()
var Dispatch = require('../dispatch')

module.exports = function(args){
  args = args || {}
  var etcd = etcdjs(config.network.etcd)
  var dispatch = Dispatch(config, etcd)

  dispatch.getAllocations(function(err, allocations){
  	console.log('-------------------------------------------');
  	console.dir(allocations)
  })
}
