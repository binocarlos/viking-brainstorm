var config = require('../lib/config')()
var tape     = require('tape')
var tools = require('./lib/tools')
var etcdjs = require('etcdjs')
var stubs = require('./lib/stubs')
var flatten = require('etcd-flatten')
var etcdserver = tools.etcd()
var etcd = etcdjs('127.0.0.1:4001')
var Schedule = require('../lib/deployment/schedule')
/*

	a test that checks that no two jobs that are the same (i.e ignoring scale number)

	mystack-abc123-prog1_1
	mystack-abc124-prog1_3

	these 2 can co-exist on the same server (they are different code)

	mystack-abc123-prog1_1
	mystack-abc123-prog1_3

	these can not co-exist (they are the same code)

	
*/

var schedule = Schedule(config, etcd)

etcdserver.stop(tape, true)
etcdserver.reset(tape)
etcdserver.start(tape)
tools.pause(tape, 1)
etcdserver.check(tape)

function processObject(obj, map){
	var ret = {}
	Object.keys(obj || {}).forEach(function(key){				
		var mapkey = map(key)
		ret[mapkey] = JSON.parse(obj[key])
	})
	return ret
}

tape('write proc stubs', function(t){
	stubs.sametagproc(schedule, function(err){
		if(err){
			t.fail(err, 'write stubs')
		}
		else{
			t.pass('write stubs')
		}
		t.end()
	})
})

/*
tape('check proc stubs', function(t){
	etcd.get('/proc', {
		recursive:true
	}, function(err, data){

		if(err){
			t.fail(err, 'check stubs')
			t.end()
			return
		}

		var procs = flatten(data.node)
		procs = processObject(procs, function(key){
			return key.replace(/^\/proc/, '')
		})

		console.log('-------------------------------------------');
		console.dir(procs)

		t.end()

	})
})
*/

//etcdserver.stop(tape)