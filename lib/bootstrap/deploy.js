#!/usr/bin/env node
var Stack = require('../stack')
var async = require('async');

var utils = require('component-consoler');
var path = require('path');
var fs = require('fs');
var config = require('../config')()
var Registry = require('../services/registry')

module.exports = function(options){

  options = options || {}

  return {

    core:function(){

      Registry(config, etcd, function(err, container){

        if(err){
          console.error(err)
          process.exit(1)
        }

        schedule.ensure(container, function(err){
          console.log('core started')  
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
    }  
  }
  
  

}
