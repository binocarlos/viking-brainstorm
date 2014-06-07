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



etcdserver.stop(tape, true)
etcdserver.reset(tape)
etcdserver.start(tape)
tools.pause(tape, 1)
etcdserver.check(tape)

var schedule = Schedule(config, etcd)

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
		var counter = 0
		procs = processObject(procs, function(key){
			key = key.replace(/^\/proc/, '')
			var parts = key.split('/')
			parts.pop()
			parts.push(counter)
			counter++
			return parts.join('/')
		})

		t.equal(procs['/test/a/test/0'].tag, 'a', 'job a')
		t.equal(procs['/test/a/test/1'].tag, 'a', 'job a')
		t.equal(procs['/test/a/test/2'].tag, 'a', 'job a')
		t.equal(procs['/test/a/test/3'].tag, 'b', 'job b')

		console.log('-------------------------------------------');
		console.dir(procs)

		t.end()

	})
})


//etcdserver.stop(tape)