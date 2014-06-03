var spawn = require('child_process').spawn
var exec = require('child_process').exec
var etcdjs = require('etcdjs')
var flatten = require('etcd-flatten')
var tape     = require('tape')
var config = require('../lib/config')()
var concat = require('concat-stream')
var tools = require('./lib/tools')
var state = {}

var etcdserver = tools.etcd()
var host = tools.host()
var core = tools.core()
var builder = tools.builder()

var etcd = etcdjs('127.0.0.1:4001')

etcdserver.reset(tape)
etcdserver.start(tape)
tools.pause(tape, 2)
etcdserver.check(tape)

tape('registry config', function(t){

	t.end()
	
  

})

tools.pause(tape, 2)
etcdserver.stop(tape)
