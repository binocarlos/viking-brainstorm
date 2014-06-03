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
var DockerRun = require('../lib/tools/dockerrun')
var tools = require('./lib/tools')
var state = {}

function getJob(){
	var vol = Volume(config, 'test', '/test1/store')

	var conf =  {
	  stack:'test',
	  name:'test1',
	  image:'quarry/monnode',
	  env:{
	    TEST:10
	  },
	  volumes:[
	    vol
	  ],
	  entrypoint:'/bin/bash',
	  command:'echo $TEST > /test1/store/env',
	  cwd:'/'
	}

	var job = getContainerDesc()
	var jobObject = Job(job)
	jobObject.ensureValues()

	return job._data
}

tape('dockerrun arguments', function(t){
	var args = DockerRun(getContainerDesc())

	console.log('-------------------------------------------');
	console.dir(args)
	t.end()
})

tape('get the docker arguments', function(t){

	

	var container = Container(job)
	
	var options = container.options()

	t.equal(options.stack, 'test', 'stack')
	t.equal(options.name, 'test1', 'name')
	t.equal(options.image, 'quarry/monnode', 'image')
	t.equal(options.volumes[0], '/var/lib/viking/volumes/test/test1/store:/test1/store', 'volume')



	t.end()

})
