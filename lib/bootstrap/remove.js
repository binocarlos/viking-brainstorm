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

      console.log('-------------------------------------------');
      console.log('deployment delete core')
    },

    proc:function(){
     
      console.log('-------------------------------------------');
      console.log('remove procs')
    },

    boot:function(){
      var cmd = options._[3]

      if(cmd=='core'){
        deploy.core()
      }
      else{
        deploy.proc()
      }
    }
  }

  return deploy
}
