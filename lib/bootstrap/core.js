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
      console.log('-------------------------------------------');
      console.dir(container)
      done()
    })

  },

  stop:function(done){
    console.log('-------------------------------------------');
    console.log('stopping the viking core')
    done()
  }

}