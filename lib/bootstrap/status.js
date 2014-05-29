#!/usr/bin/env node

var program = require('commander');

var async = require('async');
var utils = require('component-consoler');
var spawn = require('child_process').spawn

var path = require('path');
var fs = require('fs');
var log = utils.log;

var config = require('../config')();
var Tail = require('tail').Tail;

module.exports = function(options){
  console.log('');
  async.series([
    function(next){
      console.log('');
      utils.log('viking', 'config');
      console.log('');
      console.log(JSON.stringify(config, null, 4));
      next();
    },

    function(next){
      console.log('');
      utils.log('viking', 'docker processes');
      console.log('');
      var ps = spawn('docker', ['ps'], { stdio: 'inherit', customFds: [0, 1, 2] });

      ps.on('close', function(code){
        console.log('');
        next();
      })

    },

    function(next){
     
    }

  ], function(){
    
  })
}