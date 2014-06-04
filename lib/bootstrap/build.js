#!/usr/bin/env node
var Stack = require('../stack')
var async = require('async');

var utils = require('component-consoler');
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
    registry:options.registry
  })

  stack.build(function(err){
    if(err){
      return utils.error(err)
    }
    else{
      utils.log('stack built', 'done')
    }
  })

}
