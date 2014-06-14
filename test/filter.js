var config = require('../lib/config')()
var tape     = require('tape')
var tools = require('./lib/tools')
var etcdjs = require('etcdjs')
var stubs = require('./lib/stubs')
var flatten = require('etcd-flatten')
var etcdserver = tools.etcd()
var exec = require('child_process').exec

var Dispatch = require('../lib/deployment/dispatch')
var Schedule = require('../lib/deployment/schedule')
var etcd = etcdjs('127.0.0.1:4001')

/*

	a test that checks that no two jobs that are the same (i.e ignoring scale number)

	mystack-abc123-prog1_1
	mystack-abc124-prog1_3

	these 2 can co-exist on the same server (they are different code)

	mystack-abc123-prog1_1
	mystack-abc123-prog1_3

	these can not co-exist (they are the same code)

	
*/



etcdserver.stop(tape, true)
etcdserver.reset(tape)
etcdserver.start(tape)
tools.pause(tape, 1)
etcdserver.check(tape)

var schedule = Schedule(config, etcd)
var dispatch = Dispatch(config, etcd)

function processObject(obj, map){
	var ret = {}
	Object.keys(obj || {}).forEach(function(key){				
		var mapkey = map(key)
		ret[mapkey] = JSON.parse(obj[key])
	})
	return ret
}


tape('write network', function(t){
	setTimeout(function(){
		stubs.network(etcd, function(err){
			if(err){
				t.fail(err, 'write network')
			}
			else{
				t.pass('write network')
			}
			t.end()
		})
	}, 1000)
})

tape('write proc stubs', function(t){
	setTimeout(function(){
		stubs.filterproc(schedule, function(err){
			if(err){
				t.fail(err, 'write stubs')
			}
			else{
				t.pass('write stubs')
			}
			t.end()
		})
	}, 1000)
})

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
		var map = {}
		procs = processObject(procs, function(key){
			key = key.replace(/^\/proc/, '')
			var parts = key.split('/')
			parts.pop()
			var key = parts.join('/')
			if(!map[key]){
				map[key] = []
			}
			map[key].push(procs[key])
			return key
		})

		t.equal(map['/test/a/website'].length, 1, '1 website procs')
		t.equal(map['/test/a/router'].length, 1, '1 router procs')
		t.equal(map['/test/a/doublerouter'].length, 2, '2 doublerouter procs')

		t.end()

	})
})

tape('test servers have been picked based on the filter', function(t){

	dispatch.getAllocations(function(err, allocations, failed){

		if(err){
			t.fail(err, 'load allocations')
			t.end()
			return
		}

		t.equal(allocations.length, 3, '3 allocations')
		t.equal(failed.length, 1, '1 failed')

		var map = {}

		allocations.forEach(function(allocation){
			map[allocation.job.name] = allocation
		})

		t.equal(map.website.server.name, 'viking-1', 'viking 1 is the website')
		t.equal(map.router.server.name, 'viking-2', 'viking 2 is the router')
		t.equal(map.doublerouter.server.name, 'viking-2', 'viking 2 is the doublerouter')

		t.equal(failed[0].name, 'doublerouter', 'doublerouter is the failed allocation')

		t.end()

	})
})


etcdserver.stop(tape)