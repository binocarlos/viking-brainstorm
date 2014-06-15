#!/usr/bin/env node
var Stack = require('../stack')
var async = require('async');
var path = require('path');
var fs = require('fs');
var config = require('../config')()
var etcdjs = require('etcdjs')
var Registry = require('../services/registry')
var Schedule = require('../deployment/schedule')
var Stacks = require('../deployment/stacks')

var logger = require('../tools/logger')

module.exports = function(options){

  options = options || {}

  var etcd = etcdjs(options.etcd || config.network.etcd)
  var schedule = Schedule(config, etcd)
  var stacks = Stacks(config, etcd)

  var deploy = {

    core:function(){

      var job = Registry(config)
      schedule.ensureJob(job, function(err, r){
        if(err){
          logger.error(err)
          process.exit(1)
        }
      })
    },

    stack:function(){
      var exists = fs.existsSync || path.existsSync;
      var folder = options.app || process.cwd()

      var stack = Stack(config, folder, {
        config:options.config,
        dev:options.dev,
        tag:options.tag,
        registry:options.registry
      })

      async.series([
        function(next){
          stack.load(next)
        },
        function(next){
          stacks.checkExists(stack.id, stack.tag, function(err, status){
            if(status){
              return next(stack.getId() + ' already exists - use a different tag with -t')
            }
            next()
          })
        },
        function(next){
          stacks.writeStack(stack.id, stack.tag, stack.getData(), next)
        },
        function(next){
          console.log('stack ok to deploy')
          console.dir(stack._bootOrder)
        }
      ], function(err){
        if(err){
          logger.error(err)
          process.exit(1)
        }
      })

    },

    boot:function(){
      var cmd = options._[3]

      if(cmd=='core'){
        deploy.core()
      }
      else{
        deploy.stack()
      }
    }
  }

  return deploy
}
