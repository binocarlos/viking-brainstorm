#!/usr/bin/env node
var etcdjs = require('etcdjs')
var config = require('../config')()
var Slave = require('../deployment/slave')
var Network = require('../deployment/network')
var spawn = require('child_process').spawn
var logger = require('../tools/logger')
var async = require('async')

module.exports = function(args){
  args = args || {}
  var etcd = etcdjs(config.network.etcd)
  var hostname = config.network.hostname
 
 	var slave = Slave(config, etcd)
 	var network = Network(config, etcd)

 	var local = {
 		process:function(){
 			slave.processSlave(function(err, count){
		 		logger('[slave actions] ' + count)
		 	})
 		},
 		clean:function(){

 			async.series([
 			  function(next){
 					network.removeServer(hostname, false, next)
 			  },

 			  function(next){
 			  	setTimeout(next, 2000)
 			  },

 			  function(next){
 					local.process()
 			  }
 			], function(err){
 			
 			})

 		},
 		boot:function(){
 			var cmd = args._[3] || 'process'
 			if(cmd=='process'){
 				local.process()
 			}
 			else if(cmd=='clean'){
 				local.clean()
 			}
 		}
 	}

 	return local
 	
 
}
