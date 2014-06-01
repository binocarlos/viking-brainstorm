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
  	if(err){
  		console.error(err)
  	}
    if(!allocations || !allocations.length){
      console.log('no jobs')
      process.exit(0)
    }
    dispatch.runAllocations(allocations, function(err, r){
      console.log('-------------------------------------------');
      console.dir(err)
      console.dir(r)
    })
    
  })
}
