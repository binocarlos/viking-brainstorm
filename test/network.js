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

stack.checkEtcds(tape)
/*
tape('the registry should be running on viking-0', function(t){	
	
	exec('viking info keys', function(err, stdout, stderr){

		console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.dir(err)
			console.log(stdout.toString())
		exec('ssh viking-0 docker ps', function(err, stdout, stderr){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.dir(err)
			console.dir(stdout.toString())

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
	
})
*/
stack.stop(tape)