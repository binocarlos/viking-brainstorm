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
var etcd = etcdjs('192.168.8.121:4001')

var deployment = Deployment(config, etcd)
var state = {}

var stack = tools.stack()
var core = tools.core()


tape('pull registry images', function(t){	

	tools.runCommands([
		'ssh viking-0 docker pull registry',
		'ssh viking-1 docker pull registry',
		'ssh viking-2 docker pull registry'
	], function(err){
		t.end()
	})
})

stack.start(tape)
stack.checkEtcds(tape)
tools.pause(tape, 3, 'wait 3 seconds to let everything get setup')
core.deploy(tape)
tools.pause(tape, 10, 'wait 10 seconds to let everything get setup')

tape('the leader should be viking-0', function(t){	
	exec('viking info leader', function(err, stdout){
		if(err){
			t.fail(err, 'ensure the leader is viking-0')
			t.end()
			return
		}
		var leader = stdout.toString().replace(/\n/g, '')
		t.equal(leader, 'viking-0')
		t.end()
	})
})

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

tools.pause(tape, 5, 'wait 5 seconds to let everything get setup')

var newLeader = null
tape('the leader should NOT be viking-0', function(t){	
	exec('viking info leader', function(err, stdout){
		if(err){
			t.fail(err, 'ensure the leader is viking-0')
			t.end()
			return
		}
		newLeader = stdout.toString().replace(/\n/g, '')
		t.ok(newLeader!='viking-0', 'leader is not viking-0')
		console.log(newLeader)
		t.end()
	})
})


tape('check the registry is running elsewhere', function(t){	

	deployment.getState(function(err, state){
		console.log('-------------------------------------------');
		console.dir(state)
		t.end()
	})
	
	
})

stack.stop(tape)