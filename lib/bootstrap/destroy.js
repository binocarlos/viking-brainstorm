#!/usr/bin/env node
var Stack = require('../stack')
var async = require('async');
var path = require('path');
var fs = require('fs');
var config = require('../config')()
var etcdjs = require('etcdjs')
var Registry = require('../services/registry')
var Schedule = require('../deployment/schedule')
var logger = require('../tools/logger')

module.exports = function(options){

  options = options || {}

  var etcd = etcdjs(config.network.etcd)
  var schedule = Schedule(config, etcd)

  var destroy = {

    core:function(){

      schedule.removeJob({
        job:{
          stack:'core',
          tag:'default',
          name:'registry'
        },
        removeProc:true
      }, function(err){

      })

    },

    stack:function(){

      /*
      var exists = fs.existsSync || path.existsSync;
      var folder = options.app || process.cwd()

      var stack = Stack(config, folder, {
        config:options.config,
        dev:options.dev,
        tag:options.tag,
        registry:options.registry
      })
  */

      console.log('-------------------------------------------');
      console.log('do something with the stack here')
    },

    boot:function(){
      var cmd = options._[3] || 'stack'

      if(cmd=='core'){
        destroy.core()
      }
      else if(cmd=='stack'){
        destroy.stack()
      }
    }
  }

  return destroy
}
