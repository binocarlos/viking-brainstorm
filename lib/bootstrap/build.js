#!/usr/bin/env node
var Stack = require('../stack')
var async = require('async');
var path = require('path');
var fs = require('fs');
var config = require('../config')()

module.exports = function(options){
  options = options || {}

  // capture stdin here
  var exists = fs.existsSync || path.existsSync;
  var folder = options.appfolder || process.cwd()

  var stack = Stack(config, folder, {
    etcd:options.etcd,
    appfolder:options.appfolder,
    configfile:options.configfile,
    index:options.index,
    dev:options.dev,
    tag:options.tag,
    push:options.push,
    keep:options.keep,
    registry:options.registry
  })

  stack.build(function(err){
    if(err){
      return console.error(err)
    }
    else{
      console.log('[stack built] done')
    }

    if(options.push){
      stack.push(function(err){
        if(err){
          return console.error(err)
        }
        else{
          console.log('[stack pushed] done')
        }        
      })
    }
    else{

    }
  })

}
