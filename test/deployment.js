var config = require('../lib/config')()
var tape     = require('tape')
var tools = require('./lib/tools')
var etcdjs = require('etcdjs')
var stubs = require('./lib/stubs')
var flatten = require('etcd-flatten')
var etcdserver = tools.etcd()
var Deployment = require('../lib/deployment')
var etcd = etcdjs('127.0.0.1:4001')

var deployment = Deployment(config, etcd)

etcdserver.reset(tape)
etcdserver.start(tape)
tools.pause(tape, 1)
etcdserver.check(tape)

tape('write network stubs', function(t){
	t.end()
})


etcdserver.stop(tape)