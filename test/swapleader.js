var spawn = require('child_process').spawn
var exec = require('child_process').exec
var async = require('async');
var etcdjs = require('etcdjs')
var flatten = require('etcd-flatten')
var tape     = require('tape')
var config = require('../lib/config')()
var concat = require('concat-stream')
var spawnargs = require('spawn-args')
var tools = require('./lib/tools')
var Deployment = require('../lib/deployment')
var endpoints = require('../lib/tools/endpoints')
var etcdaddress = '192.168.8.121:4001'
var etcd = etcdjs(etcdaddress)

var deployment = Deployment(config, etcd)
var state = {}

var stack = tools.stack()
var core = tools.core()
var builder = tools.builder()

stack.start(tape)
stack.checkEtcds(tape)
tools.pause(tape, 3, 'wait 3 seconds to let everything get setup')
//core.deploy(tape)
//tools.pause(tape, 10, 'wait 10 seconds to let everything get setup')

var choosenLeader = null

tape('the leader should be viking-0', function(t){	
	exec('viking info leader', function(err, stdout){
		if(err){
			t.fail(err, 'ensure the leader is viking-0')
			t.end()
			return
		}
		var leader = stdout.toString().replace(/\n/g, '')

		console.log('-------------------------------------------');
		console.dir(leader)
		t.equal(leader, 'viking-0')
		t.end()
	})
})

/*
tape('the registry should be running on viking-0', function(t){	
	
	exec('ssh viking-0 docker ps', function(err, stdout, stderr){

		if(err){
			t.fail(err)
			return t.end()
		}
		if(stderr){
			t.fail(stderr.toString)
			return t.end()
		}

		var match = stdout.toString().match(/registry/)

		t.ok(match, 'registry was found in the docker ps output')
		t.end()
	})
	
})

builder.build(etcd, tape, etcdaddress, registryaddress)
builder.pull(tape)
builder.checkpull(tape)

tape('close viking-0', function(t){	
	
	exec('ssh viking-0 viking stop --clean', function(err, stdout, stderr){

		if(err){
			t.fail(err)
			return t.end()
		}
		if(stderr){
			t.fail(stderr.toString)
			return t.end()
		}

		t.pass('viking-0 closed')
		t.end()
	})
	
})

tools.pause(tape, 15, 'wait 15 seconds for the leader to switch')

var newLeader = null
tape('the leader should NOT be viking-0', function(t){	

	deployment.getState(function(err, state){
		t.ok(state.leader!='viking-0', 'leader should not be viking-0')
		t.end()
	})
})


tape('check the registry is running elsewhere', function(t){	

	deployment.getState(function(err, state){

		var choosenServer = state.run['/core/default/registry']

		t.ok(choosenServer=='viking-1'||choosenServer=='viking-2', 'the registry is on a new server in the db')

		exec('ssh ' + choosenServer + ' docker ps', function(err, stdout){
			if(err){
				t.fail(err, 'check registry in docker output')
				t.end()
				return
			}

			var output = stdout.toString()

			t.ok(output.match(/registry/), 'the registry is in the output')
			t.end()
		})
	})
})

var registryaddress = null

tape('check the registry has its new endpoint and the registry returns a 200', function(t){	

	endpoints.registry(etcd, function(err, registry){

		registryaddress = registry
		t.ok(registry=='192.168.8.121:5000' || registry=='192.168.8.122:5000', 'the registry endpoint is ok')

		t.end()
	})

})


*/
stack.stop(tape)