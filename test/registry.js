var spawn = require('child_process').spawn
var exec = require('child_process').exec
var etcdjs = require('etcdjs')
var flatten = require('etcd-flatten')
var tape     = require('tape')
var config = require('../lib/config')()
var concat = require('concat-stream')
var Registry = require('../lib/services/registry')
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

tools.pause(tape, 2)
etcdserver.stop(tape)
