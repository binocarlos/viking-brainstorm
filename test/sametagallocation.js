var config = require('../lib/config')()
var tape     = require('tape')
var tools = require('./lib/tools')
var etcdjs = require('etcdjs')
var stubs = require('./lib/stubs')
var flatten = require('etcd-flatten')
var etcdserver = tools.etcd()
var Dispatch = require('../lib/dispatch')
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

var dispatch = Dispatch(config, etcd)

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
	stubs.samehostproc(deployment, function(err){
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
		procs = processObject(procs, function(key){
			return key.replace(/^\/proc/, '')
		})

		t.ok(procs['/test/default/test1'], 'has test1')
		t.equal(procs['/test/default/test1'].id, 'test/default/test1', 'test1 id is correct')
		t.ok(procs['/test/default/test2'], 'has test2')
		t.ok(procs['/test/default/test3'], 'has test3')
		t.ok(procs['/test/default/test4'], 'has test4')
		t.ok(procs['/test/default/test5'], 'has test5')
		t.ok(procs['/test/default/test6'], 'has test6')
		t.ok(procs['/test/default/test7'], 'has test7')
		t.ok(procs['/core/default/registry'], 'has registry')
		t.equal(procs['/core/default/registry'].filter[0].tag, 'system', 'system tag')
		t.equal(procs['/core/default/registry'].id, 'core/default/registry', 'registry id is correct')

		t.end()

	})
})

var loops = []
for(var index=0; index<5; index++){
	loops.push('' + index)
}

loops.forEach(function(i){
	tape('test the proposed allocations number ' + i, function(t){

		dispatch.getAllocations(function(err, allocations){

			if(err){
				t.fail(err, 'load allocations')
				t.end()
				return
			}

			t.equal(allocations.length, 8, 'there are 8 allocations')
			
			var jobs = {}
			var jobServers = {}
			var serverCount = {}

			allocations.forEach(function(allocation){
				var job = allocation.job
				var server = allocation.server
				jobs[job.id] = job
				jobServers[job.id] = server.name
				serverCount[server.name] = serverCount[server.name] || 0
				serverCount[server.name]++
			})

			console.log(JSON.stringify(serverCount, null, 4))
			t.ok(serverCount['viking-0']>=2 && serverCount['viking-0']<=4, 'fair allocation - viking-0 - pass: ' + i)
			t.ok(serverCount['viking-1']>=2 && serverCount['viking-1']<=3, 'fair allocation - viking-1 - pass: ' + i)
			t.ok(serverCount['viking-2']>=2 && serverCount['viking-2']<=3, 'fair allocation - viking-2 - pass: ' + i)

			t.equal(jobServers['core/default/registry'], 'viking-0')
			t.equal(jobServers['test/default/test1'], 'viking-0')
			
			t.end()
		})
	})

})

etcdserver.stop(tape)