var spawn = require('child_process').spawn
var exec = require('child_process').exec
var async = require('async');
var etcdjs = require('etcdjs')
var flatten = require('etcd-flatten')
var tape     = require('tape')
var config = require('../lib/config')()
var concat = require('concat-stream')
var state = {}

function runCommands(commands, done){

	async.forEachSeries(commands, function(command, nextCmd){
		var process = spawn(command, [], {
			stdio:[null, process.stdout, process.stderr]
		})

		process.on('error', nextCmd)
		process.on('close', nextcmd)
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

		t.end()

	})

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

		t.end()

	})
  

})