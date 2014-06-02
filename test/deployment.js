var config = require('../lib/config')()
var tape     = require('tape')
var tools = require('./lib/tools')
var etcdjs = require('etcdjs')
var stubs = require('./lib/stubs')
var flatten = require('etcd-flatten')
var etcdserver = tools.etcd()
var etcd = etcdjs('127.0.0.1:4001')

etcdserver.reset(tape)
etcdserver.start(tape)
tools.pause(tape, 3)
etcdserver.check(tape)

function processObject(obj, map){
	var ret = {}
	Object.keys(obj || {}).forEach(function(key){				
		var mapkey = map(key)
		ret[mapkey] = JSON.parse(obj[key])
	})
	return ret
}

tape('write network stubs', function(t){
	stubs.network(etcd, function(err){
		if(err){
			t.fail(err, 'write stubs')
		}
		else{
			t.pass('write stubs')
		}
		t.end()
	})
})

tape('check network stubs', function(t){
	etcd.get('/', {
		recursive:true
	}, function(err, data){

		if(err){
			t.fail(err, 'check stubs')
			t.end()
			return
		}

		var servers = flatten(data.node)
		servers = processObject(servers, function(key){
			return key.replace(/^\/host\//, '').replace(/\/config$/, '')
		})

		t.ok(servers['viking-0'], 'viking 0 loaded')
		t.ok(servers['viking-1'], 'viking 1 loaded')
		t.ok(servers['viking-2'], 'viking 2 loaded')
		t.equal(servers['viking-0'].config.tags, 'system')

		t.end()

	})
})

tape('write proc stubs', function(t){


})

etcdserver.stop(tape)