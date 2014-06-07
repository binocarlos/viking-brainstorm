#!/usr/bin/env node
var etcdjs = require('etcdjs')
var config = require('../config')()
var Slave = require('../deployment/slave')
var Network = require('../deployment/network')
var spawn = require('child_process').spawn
var logger = require('../tools/logger')

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
 			network.removeServer(hostname, false, function(){
 				setTimeout(function(){
	 				local.process()
 				}, 2000)
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
