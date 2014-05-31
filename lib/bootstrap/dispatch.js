#!/usr/bin/env node
var utils = require('component-consoler');
var etcdjs = require('etcdjs')
var config = require('../config')()
var Dispatch = require('../dispatch')

module.exports = function(args){
  options = options || {}
  var etcd = etcdjs(options.network.etcd)
  var dispatch = Dispatch(config, etcd)

  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.dir(args)
}
