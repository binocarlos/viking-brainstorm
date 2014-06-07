var config = require('../lib/config')()
var tape     = require('tape')
var tools = require('./lib/tools')
var etcdjs = require('etcdjs')
var stubs = require('./lib/stubs')
var flatten = require('etcd-flatten')
var etcdserver = tools.etcd()

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
		stubs.sametagproc(schedule, function(err){
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

		t.equal(map['/test/a/test'].length, 3, '3 a procs')
		t.equal(map['/test/b/test'].length, 3, '3 b procs')
		t.equal(map['/test/c/test'].length, 3, '3 c procs')

		t.end()

	})
})

tape('test the proposed allocations number 0', function(t){

	dispatch.getAllocations(function(err, allocations){

		if(err){
			t.fail(err, 'load allocations')
			t.end()
			return
		}

		allocations.forEach(function(allocation){
			var job = allocation.job
			console.log('-------------------------------------------');
			console.dir(job.stack + '-' + job.tag + '-' + job.name + '-' + job.pid + ' -> ' + allocation.server.name)
		})

		

/*
		t.equal(allocations.length, 8, 'there are 8 allocations')
		
		var jobServers = {}
		var serverCount = {}

		allocations.forEach(function(allocation){
			var job = allocation.job
			var jobObject = Job(job)
			var server = allocation.server
			jobServers[jobObject.baseId()] = server.name
			serverCount[server.name] = serverCount[server.name] || 0
			serverCount[server.name]++
		})

		t.ok(serverCount['viking-0']>=2 && serverCount['viking-0']<=4, 'fair allocation - viking-0 - pass: ' + i)
		t.ok(serverCount['viking-1']>=2 && serverCount['viking-1']<=3, 'fair allocation - viking-1 - pass: ' + i)
		t.ok(serverCount['viking-2']>=2 && serverCount['viking-2']<=3, 'fair allocation - viking-2 - pass: ' + i)

		t.equal(jobServers['core-default-registry'], 'viking-0', 'the registry is allocated to viking 0')
		t.equal(jobServers['test-default-test1'], 'viking-0', 'the test1 is allocated to viking-0')
		
		t.end()
		*/
		t.end()
	})
})


//etcdserver.stop(tape)