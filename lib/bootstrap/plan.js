#!/usr/bin/env node
var utils = require('component-consoler');
var etcdjs = require('etcdjs')
var config = require('../config')()

module.exports = function(options){
  options = options || {}

  // capture stdin here
  var exists = fs.existsSync || path.existsSync;
  var folder = options.app || process.cwd()

  var stack = Stack(config, folder, {
    config:options.config,
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
