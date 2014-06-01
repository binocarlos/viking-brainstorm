#!/usr/bin/env node

var program = require('commander');

var async = require('async');
var utils = require('component-consoler');
var spawn = require('child_process').spawn
var exec = require('child_process').exec

var path = require('path');
var fs = require('fs');
var log = utils.log;

var etcdjs = require('etcdjs');
var config = require('../config')();
var Tail = require('tail').Tail;

module.exports = function(options){

  
  var info = {
    config:function(){
      console.log(JSON.stringify(config, null, 4));
    },
    docker:function(next){
      var ps = spawn('docker', ['ps'], { stdio: 'inherit', customFds: [0, 1, 2] });
    },
    hostname:function(done){
      console.log(config.network.hostname)
    },
    keys:function(){
      exec('etcdctl ls / --recursive', function(err, stdout){
        console.log(stdout.toString())
      })
    },
    database:function(){
      var etcd = etcdjs(config.network.etcd)
      etcd.get('/', {
        recursive:true
      }, function(err, node){
        if(err){
          console.error(err)
        }
        else{
          console.log(JSON.stringify(node.node, null, 4))
        }
      })
    },
    boot:function(){
      var cmd = options._[3]

      if(!cmd || cmd=='hostname'){
        if(!cmd){
          console.log('[hostname]')
        }
        info.hostname()
      }

      if(!cmd || cmd=='database'){
        if(!cmd){
          console.log('[database]')
        }
        info.database()
      }

      if(!cmd || cmd=='keys'){
        if(!cmd){
          console.log('[keys]')
        }
        info.keys()
      }

      if(!cmd || cmd=='config'){
        if(!cmd){
          console.log('[config]')
        }
        info.config()  
      }

      if(!cmd || cmd=='docker'){
        if(!cmd){
          console.log('[docker]')
        }
        info.docker(function(){

        })  
      }
      
    }
  }
 
  return info 
}