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
var Table = require('cli-table');

module.exports = function(options){

  var etcd = etcdjs(config.network.etcd)
  var deployment = Deployment(config, etcd)

  function getState(done){
    deployment.getState(done)
  }

  function getLeader(done){
    etcd.stats.leader(function(err, stats){
      if(err) return done(err)
      if(!stats) return done('no data')
      return done(null, stats.leader)
    })
  }

  var info = {
    config:function(next){
      console.log(JSON.stringify(config, null, 4));
      next()
    },
    state:function(next){
      getState(function(err, state){
        console.log(JSON.stringify(state, null, 4))
        next()
      })
    },
    jobs:function(next){
      async.parallel({
        state:getState
      }, function(err, data){
        var state = data.state

        var table = new Table({
          head: ['hostname'.cyan, 'id'.cyan, 'image'.cyan, 'container'.cyan, 'ports'.cyan]
        });

        Object.keys(state.proc || {}).forEach(function(key){
          var job = state.proc[key]
          var server = state.run[key]

          var id = key
          var image = job.image
          var ports = (job.ports || []).join(' ')
          var serverst = ''
          var container = ''

          if(server){
            serverst = server
            container = state.deploy['/' + server + key]
          }

          table.push([
            server || '',
            id || '',
            image || '',
            container || '',
            ports || ''
          ])
        })

        console.log(table.toString());

      })

    },
    servers:function(next){

      async.parallel({
        state:getState,
        leader:getLeader
      }, function(err, data){

        if(err){
          console.error(err)
          return next()
        }

        var state = data.state
        var leader = data.leader


        var table = new Table({
          head: ['hostname'.cyan, 'ip'.cyan, 'tags'.cyan, 'leader'.cyan, 'master'.cyan, 'slave'.cyan]
        });

        Object.keys(state.host).sort().forEach(function(hostname){
          var server = state.host[hostname]
          var config = server.config

          table.push([
            hostname || '',
            config.network.private || '',
            config.tags || '',
            leader==hostname?'y' : '',
            config.master?'y' : '',
            config.slave?'y' : ''
          ])
        })
        console.log(table.toString());
        next()
      })
    },
    docker:function(next){
      var ps = spawn('docker', ['ps'], { stdio: 'inherit', customFds: [0, 1, 2] });
      ps.on('error', next)
      ps.on('close', next)
    },
    leader:function(next){
      getLeader(function(err, leader){
        if(err){
          console.error(err)
          return next()
        }
        console.log(leader)
        next()
      })
    },
    hostname:function(next){
      console.log(config.network.hostname)
      next()
    },
    keys:function(next){
      exec('etcdctl ls / --recursive', function(err, stdout){
        console.log(stdout.toString())
        next()
      })
    },
    host:function(next){
      var log = spawn('mongroup', ['status', '--json'], {
        stdio:'inherit',
        cwd:path.normalize(__dirname + '/../..')
      })

      log.on('error', next)
      log.on('close', next)
    },
    database:function(next){
      etcd.get('/', {
        recursive:true
      }, function(err, node){
        if(err){
          console.error(err)
        }
        else{
          console.log(JSON.stringify(node.node, null, 4))
        }
        next()
      })
    },
    boot:function(){
      var cmd = options._[3]

      var mapMethods = [
        'hostname',
        'leader',
        'state',
        'database',
        'keys',
        'host',
        'docker',
        'config',
        'servers',
        'jobs'
      ]

      async.forEachSeries(mapMethods, function(method, nextMethod){
        if(!cmd || cmd==method){
          if(!cmd){
            console.log('[' + method + ']')
          }
          info[method](nextMethod)
        }
        else{
          nextMethod()
        }
      }, function(err){

      })
    }
  }
 
  return info 
}