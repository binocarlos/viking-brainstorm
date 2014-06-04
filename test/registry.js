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
var env = require('../lib/tools/env')
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

	var settings = Registry(config)
		
	t.equal(settings.stack, 'core', 'stack=core')
	t.equal(settings.name, 'registry', 'name=registry')
	t.equal(settings.image, 'registry', 'image=registry')

	var systemFilter = settings.filter.filter(function(f){
		return f.tag=='system'
	})[0]

	t.ok(systemFilter, 'there is a system filter on the registry')
	t.equal(settings.env.SETTINGS_FLAVOR, 'dev', 'development mode')

	t.equal(settings.ports.length, 1, '1 port')
	t.equal(settings.ports[0], '5000:5000', 'expose 5000')

	t.equal(settings.volumes[0], '/tmp', 'conf volume')
	t.end()
	
})

var registryJob = null
var registryData = null

tape('run the registry', function(t){

	var job = Registry(config)
	
	var jobObject = Job(job)
	jobObject.ensureValues()

	registryJob = job

	var container = Container(job, config)
	container.prepare(config, function(err){

		if(err){
			t.fail(err, 'preparing container')
			t.fail()
			return
		}

		container._job.env.SECRET_KEY = 'apples'

		container.start(function(err, data){

			if(err){
				t.fail(err, 'starting container')
				t.fail()
				return
			}

			registryData = data

			t.ok(data.State.Running, 'the container is running')
			t.equal(data.Name, '/core-default-registry', 'container name')
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


builder.build(etcd, tape)
builder.pull(tape)
builder.checkpull(tape)

tape('clean the local', function(t){

	exec('viking local clean', function(err, stdout){
		if(err){
			t.fail(err, 'viking local clean')
			t.end()
			return
		}
		t.pass('viking local clean')
		t.end()
	})
	
})



tools.pause(tape, 2)
etcdserver.stop(tape)
