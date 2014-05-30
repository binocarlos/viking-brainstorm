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
  var folder = options.app || process.cwd()

  var stack = Stack(config, folder, {
    config:options.config,
    dev:options.dev,
    tag:options.tag,
    registry:options.registry
  })

  stack.deploy(options, function(err){
    if(err){
      return utils.error(err)
    }
    else{
      utils.log('stack deployed', 'done')
    }
  })

}
