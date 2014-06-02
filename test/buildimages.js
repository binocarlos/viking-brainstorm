var spawn = require('child_process').spawn
var exec = require('child_process').exec
var etcdjs = require('etcdjs')
var flatten = require('etcd-flatten')
var tape     = require('tape')
var config = require('../lib/config')()
var concat = require('concat-stream')
var tools = require('./lib/tools')
var state = {}

var etcd = tools.etcd()
var host = tools.host()
var core = tools.core()

etcd.reset(tape)
etcd.start(tape)
tools.pause(tape, 2)
etcd.check(tape)

host.start(tape)
tools.pause(tape, 2)
host.check(tape)

core.deploy(tape)
tools.pause(tape, 10, 'wait 10 seconds to let everything get setup')
core.check(tape)

tape('etcd keys', function(t){

	var etcd = etcdjs('127.0.0.1:4001')

	etcd.get('/', {
		recursive:true
	}, function(err, result){

		if(err){
			t.fail(err.toString())
			return t.end()
		}

		result = flatten(result.node)

		t.ok(result['/host/viking-0/config'], 'the host has registered')
		t.ok(result['/proc/core/default/registry'], 'registry /proc is written')
		t.equal(result['/run/core/default/registry'], 'viking-0', 'registry is allocated to viking-0')
		t.equal(result['/fixed/core/default/registry'], 'viking-0', 'registry is fixed to viking-0')
		t.equal(result['/deploy/viking-0/core/default/registry'], 'core-default-registry', 'registry /deploy is written')
		t.equal(result['/ports/core/default/registry/5000/tcp/' + config.network.private + '/5000'], config.network.private + ':5000', 'registry /ports is written')

		t.end()
	})
	
  

})


tape('build a simple stack and commit to the registry', function(t){

	console.log('build stack...')

	var build = spawn('viking', [
		'build'
	], {
		stdio:'inherit',
		cwd:__dirname + '/example'
	})

	var etcd = etcdjs('127.0.0.1:4001')

	build.on('error', function(e){
		t.fail(e.toString())
		return t.end()
	})

	build.on('close', function(){

		console.log('stack has been built and uploaded to the registry')

		setTimeout(function(){

			etcd.get('/images', {
				recursive:true
			}, function(err, result){
				if(err){
					t.fail(err.toString())
					return t.end()	
				}

				console.log('-------------------------------------------');
				console.log('-------------------------------------------');
				console.dir(result)
				
				result = flatten(result.node)

				state.testImage = result['/images/ragnar/default/inherit']

				t.ok(state.testImage.indexOf(config.network.private)>=0, 'image name containes private hostname')

				t.end()
			})
		}, 2000)
	})

})

tape('pull an image from the registry when docker run is used', function(t){

	console.log('run image' + state.testImage)

	if(!state.testImage){
		t.fail('has no test image name')
		return t.end()
	}

	var run = spawn('docker', [
		'run',
		'-t',
		'--rm',
		state.testImage,
		'echo',
		'/etc/mysetting'
	], {
		stdio:'inherit'
	})

	run.on('error', function(err){
		t.fail(e.toString())
		t.end()
	})
	run.on('close', function(){
		t.end()
	})


})


tape('check the right image was pulled correctly', function(t){

	console.log('check image...')

	if(!state.testImage){
		t.fail('has no test image name')
		return t.end()
	}

	var run = spawn('docker', [
		'run',
		'-t',
		state.testImage,
		'echo',
		'/etc/mysetting'
	])

	var pass = false

	run.stdout.on('data', function (data) {
		if(data.toString().match(/\/etc\/mysetting/)){
			pass = true
		}
	  console.log('stdout: ' + data);
	});

	run.stderr.on('data', function (data) {
	  console.log('stderr: ' + data);
	  t.fail(data.toString())
	});

	run.on('close', function (code) {
	  t.ok(pass, 'the output contained the value buried in the uploaded image')
	  t.end()
	});

})

host.stop(tape)
tools.pause(tape, 2)
etcd.stop(tape)
