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
var state = {}

var stack = tools.stack()

stack.start(tape)

tape('etcd should be running on all viking servers', function(t){
	async.forEachSeries(['viking-0', 'viking-1', 'viking-2'], function(hostname, nextHost){

		exec('ssh ' + hostname + ' docker ps | grep etcd', function(err, stdout, stderr){
			if(err){
				t.fail(err)
				return nextHost()
			}
			if(stderr){
				t.fail(stderr.toString)
				return nextHost()
			}

			var match = stdout.toString().match(/etcd/)

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

function checkRegistry(t){
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

tape('the registry should be running on viking-0', function(t){	
	function runTest(){
		checkRegistry(t)
	}
	console.log('wait a few seconds to let everything get setup')
	setTimeout(runTest, 5000)
	
})

stack.stop(tape)