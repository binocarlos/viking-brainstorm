#!/usr/bin/env node
var async = require('async');
var utils = require('component-consoler');
var path = require('path');
var fs = require('fs');
var config = require('../config')()
var Schedule = require('../schedule')
var etcdjs = require('etcdjs')
var Registry = require('../services/registry')

var etcd = etcdjs(config.network.etcd)
var schedule = Schedule(config, etcd)

module.exports = {
  start:function(done){

    Registry(config, etcd, function(err, container){

      if(err){
        console.error(err)
        process.exit(1)
      }

      schedule.ensure(container, function(err){
        console.log('core started')  
      })
      
    })

  },

  stop:function(done){
    console.log('-------------------------------------------');
    console.log('stopping the viking core')
    done()
  }

}