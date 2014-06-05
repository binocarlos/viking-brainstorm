#!/usr/bin/env node
var Stack = require('../stack')
var async = require('async');

var path = require('path');
var fs = require('fs');
var config = require('../config')()
var logger = require('../tools/logger')

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
    keep:options.keep,
    registry:options.registry
  })

  stack.push(options.keep ? true : false, function(err){
    if(err){
      return logger.error(err)
    }
    else{
      logger('[stack built] done')
    }
  })

}
