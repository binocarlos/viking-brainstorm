#!/usr/bin/env node
var etcdjs = require('etcdjs')
var config = require('../config')()
var Dispatch = require('../deployment/dispatch')

module.exports = function(args){
  args = args || {}
  var etcd = etcdjs(config.network.etcd)
  var dispatch = Dispatch(config, etcd)

  var dispatch = {
    boot:function(){
      var cmd = args._[3]

      dispatch.run(function(){

      })
      removeServers(function(){
        di()  
      })

      
    }
  }

  return dispatch
  
}
