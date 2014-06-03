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

host.start(tape)
tools.pause(tape, 2)
host.check(tape)

core.deploy(tape)
tools.pause(tape, 10, 'wait 10 seconds to let everything get setup')
core.check(tape)

tape('etcd keys', function(t){

	

	etcd.get('/', {
		recursive:true
	}, function(err, result){

		if(err){
			t.fail(err.toString())
			return t.end()
		}

		result = flatten(result.node)

		t.ok(result['/host/viking-0/config'], 'the host has registered')
		t.ok(result['/proc/core/default/registry'], 'registry /proc is written')
		t.equal(result['/run/core/default/registry'], 'viking-0', 'registry is allocated to viking-0')
		t.equal(result['/fixed/core/default/registry'], 'viking-0', 'registry is fixed to viking-0')
		t.equal(result['/deploy/viking-0/core/default/registry'], 'core-default-registry', 'registry /deploy is written')
		t.equal(result['/ports/core/default/registry/5000/tcp/' + config.network.private + '/5000'], config.network.private + ':5000', 'registry /ports is written')

		t.end()
	})
	
  

})

/*

builder.build(etcd, tape)
builder.pull(tape)
builder.checkpull(tape)
*/

host.stop(tape)
tools.pause(tape, 2)
etcdserver.stop(tape)
