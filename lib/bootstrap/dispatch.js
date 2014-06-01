#!/usr/bin/env node
var utils = require('component-consoler');
var etcdjs = require('etcdjs')
var config = require('../config')()
var Deployment = require('../deployment')

module.exports = function(args){
  args = args || {}
  var etcd = etcdjs(config.network.etcd)
  var deployment = Dispatch(config, etcd)

  function runAllocations(){
    deployment.getAllocations(function(err, allocations){
      if(err){
        console.error(err)
      }
      if(!allocations || !allocations.length){
        console.log('no jobs')
        process.exit(0)
      }
      utils.log('dispatch', allocations.length + ' jobs')
      deployment.runAllocations(allocations, function(err, r){
        console.log('-------------------------------------------');
        console.dir(err)
        console.dir(r)
      })
      
    })
  }

  var dispatch = {
    boot:function(){
      var cmd = args._[3]

      runAllocations()
    }
  }
  
}
