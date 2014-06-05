var config = require('../lib/config')()
var tape     = require('tape')
var tools = require('./lib/tools')
var etcdjs = require('etcdjs')
var stubs = require('./lib/stubs')
var flatten = require('etcd-flatten')
var etcdserver = tools.etcd()
var exec = require('child_process').exec
var etcd = etcdjs('127.0.0.1:4001')
var path = require('path');
var env = require('../lib/tools/env')

etcdserver.reset(tape)
etcdserver.start(tape)
tools.pause(tape, 2)
etcdserver.check(tape)

tape('inject and load some environment variables', function(t){
	var filepath = path.normalize(__dirname + '/env/example.txt')

	exec('cat ' + filepath + ' | viking env inject tester', function(err, stdout){

		if(err){
			t.fail(err, 'env inject')
			t.end()
			return
		}

		env.load('tester', function(err, data){
			t.equal(data.HELLO, 'world', 'hello=world')
			t.equal(data.FRUIT, 'ORANGE', 'fruit=orange')
			t.end()
		})


	})


})


tape('check the process function', function(t){
	
	var filepath = path.normalize(__dirname + '/env/master.txt')

	exec('cat ' + filepath + ' | viking env inject master', function(err, stdout){


		if(err){
			t.fail(err, 'env inject')
			t.end()
			return
		}


		env.process({
			'NORMAL':'chair',
			'COLOR':'_master:COLOR',
			'MAPCOLOR':'_master:COLOR',
			'BLANK':'_master:COLOR2',
			'FRUIT':'_tester:FRUIT'
		}, function(err, data){


			if(err){
				t.fail(err, 'process env')
				t.end()
				return
			}

			t.equal(data.NORMAL, 'chair', 'normal = chair')
			t.equal(data.COLOR, 'red', 'color = red')
			t.equal(data.MAPCOLOR, 'red', 'mapcolor = red')
			t.equal(data.FRUIT, 'ORANGE', 'fruit = orange')
			t.notok(data.hasOwnProperty('BLANK'), 'no blank value')

			t.end()
		})


	})
})

etcdserver.stop(tape)