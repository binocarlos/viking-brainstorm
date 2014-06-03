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
var Volume = require('../lib/tools/volume')
var tools = require('./lib/tools')
var state = {}

function getContainerDesc(){
	var vol = Volume(config, 'test', '/test1/store')

	return  {
	  stack:'test',
	  name:'test1',
	  image:'quarry/monnode',
	  env:{
	    TEST:10
	  },
	  volumes:[
	    vol
	  ],
	  remove:true,
	  entrypoint:'/bin/bash',
	  command:'echo $TEST > /test1/store/env',
	  cwd:'/'
	}
}

tape('get the docker arguments', function(t){

	var job = getContainerDesc()
	var jobObject = Job(job)
	jobObject.ensureValues()

	var container = Container(job)
	
	var options = container.options()

	t.equal(options.stack, 'test', 'stack')
	t.equal(options.name, 'test1', 'name')
	t.equal(options.image, 'quarry/monnode', 'image')
	t.equal(options.volumes[0], '/var/lib/viking/volumes/test/test1/store:/test1/store', 'volume')

	console.dir(options)
	container.start(function(err, data){
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.dir(err)
		console.dir(data)
		t.end()
	})
  

})
