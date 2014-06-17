#!/usr/bin/env node
var Stack = require('../stack')
var async = require('async');
var path = require('path');
var fs = require('fs');
var config = require('../config')()
var etcdjs = require('etcdjs')
var Registry = require('../services/registry')
var Schedule = require('../deployment/schedule')
var Deploy = require('../deployment/deploy')
var Stacks = require('../deployment/stacks')

var logger = require('../tools/logger')

module.exports = function(options){

  options = options || {}

  var etcd = etcdjs(options.etcd || config.network.etcd)
  var schedule = Schedule(config, etcd)
  var stacks = Stacks(config, etcd)
  var deployer = Deploy(config, etcd)

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
      var phase = options.phase || 'staging'

      var stack = Stack(config, folder, {
        config:options.config,
        dev:options.dev,
        tag:options.tag,
        registry:options.registry
      })

      stack.setPhase(phase)

      async.series([
        function(next){
          stack.load(next)
        },
        function(next){
          logger('[check stack exists] ' + stack.getId())
          stacks.checkExists(stack.id, stack.tag, stack.phase, function(err, status){
            if(status){
              return next(stack.getId() + ' already exists - use a different tag with -t or viking destroy stack/tag/phase')
            }
            next()
          })
        },
        function(next){

          // these are stacks that need to be running because this one depends on them in some way
          logger('[check dependencies] ' + stack.getId())
          stacks.checkDependencies(stack.getDependencies(), function(err, status){
            if(err){
              console.error(err)
              process.exit(1)
            }
            next()
          })
        },
        
        function(next){

          // each element in the bootOrder is a batch
          async.forEachSeries(stack._bootOrder, function(batch, nextBatch){

            logger('[run batch] ' + stack.getId() + ' - ' + batch.length + ' jobs')

            // turn the batch of names into a list of actual jobs
            var jobs = []
            batch.forEach(function(name){
              var job = stack.getJob(name)
              var scaleJobs = schedule.getScaleJobs(job)
              jobs = jobs.concat(scaleJobs)
            })

            console.log(JSON.stringify(jobs, null, 4))
            process.exit()

            deployer.deployBatch(jobs, function(err){
              console.log('-------------------------------------------');
              console.log('-------------------------------------------');
              console.log('-------------------------------------------');
              console.log('done batch')
            })

          }, next)
          
        },

        function(next){
          logger('[write stack] ' + stack.getId())
          stacks.writeStack(stack.id, stack.tag, stack.phase, stack.getData(), next)
        },
        
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
