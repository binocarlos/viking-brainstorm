var spawn = require('child_process').spawn
var exec = require('child_process').exec
var etcdjs = require('etcdjs')
var flatten = require('etcd-flatten')
var tape     = require('tape')
var config = require('../lib/config')()
var Container = require('../lib/tools/container')
var concat = require('concat-stream')
var Registry = require('../lib/services/registry')
var endpoints = require('../lib/tools/endpoints')
var Job = require('../lib/tools/job')
var tools = require('./lib/tools')
var state = {}

var etcdserver = tools.etcd()
var host = tools.host()
var core = tools.core()
var builder = tools.builder()

var etcd = etcdjs('127.0.0.1:4001')

etcdserver.reset(tape)
etcdserver.start(tape)
tools.pause(tape, 2)
etcdserver.check(tape)

tape('registry config', function(t){

	

	Registry(config, etcd, function(err, settings){
		if(err){
			t.fail(err, 'get registry settings')
			t.end()
			return
		}

		t.equal(settings.stack, 'core', 'stack=core')
		t.equal(settings.name, 'registry', 'name=registry')
		t.equal(settings.image, 'registry', 'image=registry')

		var systemFilter = settings.filter.filter(function(f){
			return f.tag=='system'
		})[0]

		t.ok(systemFilter, 'there is a system filter on the registry')

		t.equal(settings.env.DOCKER_REGISTRY_CONFIG, '/registryconfig/config.yml', 'the config path is set')
		t.equal(settings.env.SETTINGS_FLAVOR, 'development', 'development mode')

		t.equal(settings.ports.length, 1, '1 port')
		t.equal(settings.ports[0], '5000:5000', 'expose 5000')

		t.equal(settings.volumes.length, 2, '2 volumes')

		t.equal(settings.volumes[0], '/srv/projects/viking/files/registry:/registryconfig', 'conf volume')
		t.equal(settings.volumes[1], '/var/lib/viking/volumes/core/data/registry:/data/registry', 'data volume')
		t.end()
	})
	
  

})

var registryJob = null
var registryData = null

tape('run the registry', function(t){

	Registry(config, etcd, function(err, job){
		if(err){
			t.fail(err, 'get registry settings')
			t.end()
			return
		}

		var jobObject = Job(job)
		jobObject.ensureValues()

		registryJob = job
		var container = Container(job, config)


		container.start(function(err, data){

			if(err){
				t.fail(err, 'starting container')
				t.fail()
				return
			}

			registryData = data

			t.ok(data.State.Running, 'the container is running')
			t.equal(data.Name, '/core-registry', 'container name')
			t.end()

		})
	})
	
})


tape('write the endpoints for the registry', function(t){

	endpoints.writeDockerEndpoint(etcd, {
		ip:'192.168.8.120',
		container:registryData,
		job:registryJob
	}, function(err){
		if(err){
			t.fail(err, 'writing endpoint')
			t.end()
			return
		}

		endpoints.registry(etcd, function(err, endpoint){
			t.equal(endpoint, '192.168.8.120:5000', 'the registry endpoint is written')
			t.end()
		})


	})	
})

/*
builder.build(etcd, tape)
builder.pull(tape)
builder.checkpull(tape)
*/

tape('clean the local', function(t){

	exec('viking local clean', function(err, stdout){
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log(err)
		console.log(stdout.toString())
		t.end()
	})
	
})

tools.pause(tape, 2)
etcdserver.stop(tape)
