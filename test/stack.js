var spawn = require('child_process').spawn
var exec = require('child_process').exec
var etcdjs = require('etcdjs')
var flatten = require('etcd-flatten')
var tape     = require('tape')
var config = require('../lib/config')()

tape('initialize', function(t){
	var start = spawn('viking', [
		'start',
		'--seed'
	], {
		stdio:'inherit'
	})

	start.on('error', function(e){
		throw new Error(e)
	})

	start.on('close', function(){

		console.log('wait a few seconds to let everything get setup')
		setTimeout(function(){
			exec('docker ps', function(err, stdout, stderr){
				if(err || stderr){
					throw new Error(stderr)
				}

				var content = stdout.toString()

				// we should have a registry and etcd running

				t.ok(content.match(/etcd/, 'etcd running'))
				t.ok(content.match(/core-registry-system/, 'registry running'))

				t.end()

			})
		},5000)
		
	})
})


tape('etcd keys', function(t){


	var etcd = etcdjs('127.0.0.1:4001')

	etcd.get('/', {
		recursive:true
	}, function(err, result){

		if(err) throw new Error(err)

		result = flatten(result.node)

		t.ok(result['/host/viking-0'], 'the host has registered')
		t.ok(result['/proc/core/registry/system'], 'registry /proc is written')
		t.equal(result['/run/core/registry/system'], 'viking-0', 'registry is allocated to viking-0')
		t.equal(result['/fixed/core/registry/system'], 'viking-0', 'registry is fixed to viking-0')
		t.equal(result['/deploy/viking-0/core/registry/system'], 'core-registry-system', 'registry /deploy is written')
		t.equal(result['/ports/core/registry/system/5000/tcp/' + config.network.private + '/5000'], config.network.private + ':5000', 'registry /ports is written')

		t.end()
	})
	
  

})

tape('build a simple stack and commit to the registry', function(t){

	var build = spawn('viking', [
		'build'
	], {
		stdio:'inherit',
		cwd:__dirname + '/example'
	})

	var etcd = etcdjs('127.0.0.1:4001')

	build.on('error', function(e){
		throw new Error(e)
	})

	build.on('close', function(){

		console.log('stack has been built and uploaded to the registry')

		setTimeout(function(){

			etcd.get('/', {
				recursive:true
			}, function(err, result){
				if(err) throw err

				result = flatten(result.node)

				console.log('-------------------------------------------');
				console.log('-------------------------------------------');
				console.dir(result)
				console.log(JSON.stringify(result, null, 4))
				t.end()
			})
		}, 2000)
	})

})


tape('shutdown', function(t){

	var stop = spawn('viking', [
		'stop'
	], {
		stdio:'inherit'
	})

	stop.on('error', function(e){
		throw new Error(e)
	})

	stop.on('close', function(){
		t.end()
	})
  

})