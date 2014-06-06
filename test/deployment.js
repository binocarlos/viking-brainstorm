var config = require('../lib/config')()
var tape     = require('tape')
var tools = require('./lib/tools')
var etcdjs = require('etcdjs')
var stubs = require('./lib/stubs')
var flatten = require('etcd-flatten')
var etcdserver = tools.etcd()

var etcd = etcdjs('127.0.0.1:4001')

var stubwriter = tools.stubwriter()
var core = tools.core()

etcdserver.stop(tape, true)
etcdserver.reset(tape)
etcdserver.start(tape)
tools.pause(tape, 2)
etcdserver.check(tape)

stubwriter.singlenetwork(etcd, tape)

core.deploy(tape)

tape('check the proc deployment', function(t){

	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.dir('check /proc')
	etcd.get('/proc', {
		recursive:true
	}, function(err, result){
		if(err){
			t.fail(err, 'load proc data')
			t.end()
			return
		}
		result = flatten(result.node)
		result = tools.processObject(result, function(key){
			return key
		})

		var job
		var key
		Object.keys(result || {}).forEach(function(jkey){
			job = result[jkey]
			key = jkey

		})

		t.equal(job.stack, 'core', 'stack')
		t.equal(job.name, 'registry', 'name')
		t.equal(job.image, 'registry', 'image')
		t.equal(job.tag, 'default', 'tag')
		t.equal(job.id, 'core-default-registry-' + job.pid, 'id')
		t.equal(key, '/proc/core/default/registry/' + job.pid, 'key')


		

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.dir(result)
		t.end()
	})
})

//etcdserver.stop(tape)