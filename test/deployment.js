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


tape('run the slave', function(t){

	exec('viking slave', function(err, stdout){
		if(err){
			t.fail(err, 'slave')
			t.end()
			return
		}
		console.log(stdout.toString())
		t.pass('slave')
		t.end()
	})

})

tools.pause(tape, 10)
core.check(tape)

tape('check the dispatch /run', function(t){

	etcd.get('/run', {
		recursive:true
	}, function(err, result){
		if(err){
			t.fail(err, 'load run data')
			t.end()
			return
		}
		result = flatten(result.node)
		
		t.equal(result['/run/core/default/registry/' + pid], 'viking-0', 'the /run is set to the hostname')
		t.end()

	})
})


tape('check the dispatch /deploy', function(t){

	etcd.get('/deploy', {
		recursive:true
	}, function(err, result){
		if(err){
			t.fail(err, 'load deploy data')
			t.end()
			return
		}
		result = flatten(result.node)

		t.equal(result['/deploy/viking-0/core/default/registry/' + pid], 'core-default-registry-' + pid, 'the /deploy is set correctly')
		t.end()

	})
})


tape('check the dispatch /container', function(t){

	etcd.get('/container', {
		recursive:true
	}, function(err, result){
		if(err){
			t.fail(err, 'load container data')
			t.end()
			return
		}
		result = flatten(result.node)

		if(!result['/container/viking-0/core/default/registry/' + pid]){
			t.fail('the path is not set')
			t.end()
			return
		}

		var container = JSON.parse(result['/container/viking-0/core/default/registry/' + pid])
		t.deepEqual(container.Args, ['-c', 'exec docker-registry'], 'container args')
		t.end()

	})
})


tape('check the dispatch /fixed', function(t){

	etcd.get('/fixed', {
		recursive:true
	}, function(err, result){
		if(err){
			t.fail(err, 'load fixed data')
			t.end()
			return
		}
		result = flatten(result.node)

		t.equal(result['/fixed/core/default/registry/' + pid], 'viking-0', 'the fixed is correct')

		t.end()

	})
})

tape('check the dispatch /ports', function(t){

	etcd.get('/ports', {
		recursive:true
	}, function(err, result){
		if(err){
			t.fail(err, 'load ports data')
			t.end()
			return
		}
		result = flatten(result.node)

		t.equal(result['/ports/core/default/registry/' + pid + '/5000/tcp/' + config.network.private + '/5000'], config.network.private + ':5000', 'port is set')

		t.end()

	})
})


tape('clean the slave', function(t){

	exec('viking slave clean', function(err, stdout){
		if(err){
			t.fail(err, 'slave_clean')
			t.end()
			return
		}
		console.log(stdout.toString())
		t.pass('slave_clean')
		t.end()
	})

})



tape('make sure the registry was removed', function(t){

	exec('docker ps -a', function(err, stdout){
		if(err){
			t.fail(err, 'check registry removed')
			t.end()
			return
		}
		var output = stdout.toString()
		
		if(output.match(/registry/)){
			t.fail('check registry removed')
		}
		else{
			t.pass('check registry removed')	
		}
		
		t.end()
	})

})

etcdserver.stop(tape)