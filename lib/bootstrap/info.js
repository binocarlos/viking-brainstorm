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
var Deployment = require('../deployment')
var config = require('../config')();
var Tail = require('tail').Tail;

module.exports = function(options){

  var etcd = etcdjs(config.network.etcd)
  var deployment = Deployment(config, etcd)

  var info = {
    config:function(){
      console.log(JSON.stringify(config, null, 4));
    },
    state:function(next){
      deployment.getState(function(err, state){
        console.log(JSON.stringify(state, null, 4))
        next()
      })
    },
    docker:function(next){
      var ps = spawn('docker', ['ps'], { stdio: 'inherit', customFds: [0, 1, 2] });
      ps.on('error', next)
      ps.on('close', next)
    },
    leader:function(next){
      
      etcd.stats.leader(function(err, stats){
        console.log(stats.leader)
      })
    },
    hostname:function(done){
      console.log(config.network.hostname)
    },
    keys:function(done){
      exec('etcdctl ls / --recursive', function(err, stdout){
        console.log(stdout.toString())
        done()
      })
    },
    host:function(done){
      var log = spawn('mongroup', ['status', '--json'], {
        stdio:'inherit',
        cwd:path.normalize(__dirname + '/../..')
      })

      log.on('error', done)
      log.on('close', done)
    },
    database:function(done){
      etcd.get('/', {
        recursive:true
      }, function(err, node){
        if(err){
          console.error(err)
        }
        else{
          console.log(JSON.stringify(node.node, null, 4))
        }
        done()
      })
    },
    boot:function(){
      var cmd = options._[3]

      async.series([
        function(next){
        
          if(!cmd || cmd=='hostname'){
            if(!cmd){
              console.log('[hostname]')
            }
            info.hostname()
          }

          next()

        },

        function(next){
        
          if(!cmd || cmd=='leader'){
            if(!cmd){
              console.log('[leader]')
            }
            info.leader()
          }

          next()

        },

        function(next){
        
          if(!cmd || cmd=='state'){
            if(!cmd){
              console.log('[state]')
            }
            info.state(next)
          }
          else{
            next()
          }

        },

        function(next){
        
          if(!cmd || cmd=='database'){
            if(!cmd){
              console.log('[database]')
            }
            info.database(next)
          }
          else{
            next()
          }

        },

        function(next){
              
          if(!cmd || cmd=='keys'){
            if(!cmd){
              console.log('[keys]')
            }
            info.keys(next)
          }
          else{
            next()
          }

        },

        function(next){
          

          if(!cmd || cmd=='host'){
            if(!cmd){
              console.log('[host]')
            }
            info.host(next)
          }
          else{
            next()
          }
        },

        function(next){
          if(!cmd || cmd=='config'){
            if(!cmd){
              console.log('[config]')
            }
            info.config()
          }
          next()
        },

        function(next){
          if(!cmd || cmd=='docker'){
            if(!cmd){
              console.log('[docker]')
            }
            info.docker(next)
          }
          else{
            next()
          }
        }
      ], function(err){
      
      })      
    }
  }
 
  return info 
}