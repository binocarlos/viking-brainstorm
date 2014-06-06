var config = require('../lib/config')()
var tape     = require('tape')
var tools = require('./lib/tools')
var etcdjs = require('etcdjs')
var stubs = require('./lib/stubs')
var flatten = require('etcd-flatten')
var etcdserver = tools.etcd()
var exec = require('child_process').exec

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

var pid = null
tape('check the proc deployment', function(t){

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

		pid = job.pid

		t.end()
	})
})

tape('run the dispatch', function(t){

	exec('viking dispatch', function(err, stdout){
		if(err){
			t.fail(err, 'dispatch')
			t.end()
			return
		}
		console.log(stdout.toString())
		t.pass('dispatch')
		t.end()
	})

})

tape('check the dispatch /run', function(t){

	etcd.get('/run', {
		recursive:true
	}, function(err, result){
		if(err){
			t.fail(err, 'load proc data')
			t.end()
			return
		}
		result = flatten(result.node)
		
		t.equal(result['/run/core/default/registry/' + pid], 'viking-0', 'the /run is set to the hostname')
		t.end()

	})
})


etcdserver.stop(tape)