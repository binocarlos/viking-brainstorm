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


      stack.load(function(err){

          
        stacks.checkExists(stack, function(err, status){
          if(err){
            logger.error(err)
            process.exit(1)
          }

          if(status.exists){
            logger.error(stack.getId() + ' already exists')
            process.exit(1)
          }
        })
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
