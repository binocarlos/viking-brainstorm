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
var Stacks = require('../deployment/stacks')

module.exports = function(options){

  options = options || {}

  var etcd = etcdjs(config.network.etcd)
  var schedule = Schedule(config, etcd)
  var stacks = Stacks(config, etcd)

  var destroy = {

    core:function(){

      schedule.getPIDS({
        stack:'core',
        tag:'static',
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
              tag:'static',
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

      var stackid = options._[3]

      var stack = options.stack
      var tag = options.tag
      var phase = options.phase

      if(stackid){
        var parts = stackid.replace(/^\//, '').split('/')

        stack = parts[0]
        tag = parts[1]
        phase = parts[2]

      }


      async.series([
        function(next){
          stacks.checkExists(stack, tag, phase, function(err, status){
            if(!status){
              return next(stack + '/' + tag + '/' + phase + ' does not exist')
            }
            next()
          })
        },
        function(next){
          stacks.remove(stack, tag, phase, function(err){
            if(err) return next(err)
            logger('[stack remove] ' + stack + '/' + tag + '/' + phase)
          })
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
