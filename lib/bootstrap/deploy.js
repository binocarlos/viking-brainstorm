#!/usr/bin/env node
var Stack = require('../stack')
var async = require('async');

var utils = require('component-consoler');
var path = require('path');
var fs = require('fs');
var config = require('../config')()
var etcdjs = require('etcdjs')
var Registry = require('../services/registry')
var Deployment = require('../deployment')

module.exports = function(options){

  options = options || {}

  var etcd = etcdjs(config.network.etcd)
  var deployment = Deployment(config, etcd)

  var deploy = {

    core:function(){

      Registry(config, etcd, function(err, container){

        if(err){
          console.error(err)
          process.exit(1)
        }

        deployment.ensureJob(container, function(err, r){
          console.log('-------------------------------------------');
          console.dir(err)
          console.dir(r)
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


      console.log('-------------------------------------------');
      console.log('do something with the stack here')
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
