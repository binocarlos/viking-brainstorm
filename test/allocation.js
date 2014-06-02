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
	etcd.get('/host', {
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
	stubs.proc(deployment, function(err){
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
		t.ok(procs['/core/default/registry'], 'has registry')
		t.equal(procs['/core/default/registry'].filter[0].tag, 'system', 'system tag')
		t.equal(procs['/core/default/registry'].id, 'core/default/registry', 'registry id is correct')

		t.end()

	})
})

tape('test the proposed allocations', function(t){
	deployment.getAllocations(function(err, allocations){

		if(err){
			t.fail(err, 'load allocations')
			t.end()
			return
		}

		t.equal(allocations.length, 6, 'there are 6 allocations')
		
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
		
		console.dir(jobServers)
		console.dir(serverCount)
		t.end()
	})
})

etcdserver.stop(tape)