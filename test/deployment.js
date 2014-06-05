var config = require('../lib/config')()
var tape     = require('tape')
var tools = require('./lib/tools')
var etcdjs = require('etcdjs')
var stubs = require('./lib/stubs')
var flatten = require('etcd-flatten')
var etcdserver = tools.etcd()

var etcd = etcdjs('127.0.0.1:4001')

var stubwriter = tools.stubwriter()

etcdserver.reset(tape)
etcdserver.start(tape)
tools.pause(tape, 2)
etcdserver.check(tape)

stubwriter.network(etcd, tape)

etcdserver.stop(tape)