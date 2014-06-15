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

      schedule.getPIDS({
        stack:'core',
        tag:'default',
        name:'registry'
      }, function(err, pids){

        if(err){
          logger.error(err)
          return
        }
        async.forEachSeries(pids, function(pid, nextPid){

          schedule.removeJob({
            job:{
              stack:'core',
              tag:'default',
              name:'registry',
              pid:pid
            },
            removeProc:true,
            removeServer:true
          }, nextPid)

        }, function(){

        })
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
          stacks.checkExists(stack, function(err, status){
            if(status){
              return next(stack.getId() + ' already exists - use a different tag with -t')
            }
            next()
          })
        },
        function(next){
          stacks.writeStack(stack, next)
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
      var cmd = options._[3] || 'stack'

      if(cmd=='core'){
        destroy.core()
      }
      else{
        destroy.stack()
      }
    }
  }

  return destroy
}
