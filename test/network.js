var spawn = require('child_process').spawn
var exec = require('child_process').exec
var async = require('async');
var etcdjs = require('etcdjs')
var flatten = require('etcd-flatten')
var tape     = require('tape')
var config = require('../lib/config')()
var concat = require('concat-stream')
var spawnargs = require('spawn-args')
var state = {}

function runCommands(commands, done){

	async.forEachSeries(commands, function(command, nextCmd){

		var args = spawnargs(command)

		var cmd = args.shift()
		var p = spawn(cmd, args, {
			stdio:[null, process.stdout, process.stderr]
		})

		p.on('error', nextCmd)
		p.on('close', nextCmd)
	}, done)
}

// start viking - this will boot etcd and get the registry running
tape('initialize', function(t){

	var commands = [
		'ssh viking-0 viking start --seed',
		'ssh viking-1 viking start',
		'ssh viking-2 viking start'
	]

	runCommands(commands, function(err){
		if(err){
			t.fail(err)
			return t.end()
		}

		t.pass('vikings started')
		t.end()

	})

})

tape('etcd should be running on all viking servers', function(t){
	async.forEachSeries(['viking-0', 'viking-1', 'viking-2'], function(hostname, nextHost){
		exec('ssh ' + hostname + ' docker ps', function(err, stdout, stderr){
			if(err){
				t.fail(err)
				return nextHost()
			}
			if(stderr){
				t.fail(stderr.toString)
				return nextHost()
			}

			var match = stdout.toString().match(/core-etcd/)

			t.ok(match, 'etcd was found in the docker ps output')
			nextHost()
		})
	}, function(err){
		if(err){
			t.fail(err)
			return t.end()
		}

		t.pass('etcd was found in all servers')
		t.end()
	})
})

tape('the registry should be running on viking-0', function(t){

	function runTest(){
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
	}

	console.log('wait a few seconds to let everything get setup')
	setTimeout(runTest, 5000)
	
})

tape('shutdown', function(t){

	var commands = [
		'ssh viking-2 viking stop',
		'ssh viking-2 sudo viking reset',
		'ssh viking-1 viking stop',
		'ssh viking-1 sudo viking reset',
		'ssh viking-0 viking stop',
		'ssh viking-0 sudo viking reset'
	]

	runCommands(commands, function(err){
		if(err){
			t.fail(err)
			return t.end()
		}

		t.pass('vikings ended')
		t.end()

	})
  

})