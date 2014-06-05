#!/usr/bin/env node
var etcdjs = require('etcdjs')
var config = require('../config')()
var Deployment = require('../deployment')
var spawn = require('child_process').spawn
module.exports = function(args){
  args = args || {}
  var etcd = etcdjs(config.network.etcd)
  var hostname = config.network.hostname
 
 	var deployment = Deployment(config, etcd)

 	var local = {
 		process:function(){
 			deployment.processSlave(function(err, count){
		 		console.log('[slave actions] ' + count)
		 	})
 		},
 		clean:function(){
 			deployment.removeServer(hostname, false, function(){
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
