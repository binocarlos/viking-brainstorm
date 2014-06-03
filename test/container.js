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

	var job =  {
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

	var jobObject = Job(job)
	jobObject.ensureValues()

	return jobObject.data()
}

tape('dockerrun arguments', function(t){
	var args = DockerRun(getJob())

	t.equal(args.length, 12, 'there are 12 args')

	t.deepEqual(args, [ '-t',
	  '--name',
	  'test/default/test1',
	  '-v',
	  '/var/lib/viking/volumes/test/test1/store:/test1/store',
	  '-e',
	  'TEST=10',
	  'quarry/monnode',
	  'echo',
	  '$TEST',
	  '>',
	  '/test1/store/env' ], 'the args are correct')

	t.end()
})

tape('get the docker arguments from the container', function(t){

	var container = Container(getJob())
	
	var options = container.options()

	t.equal(options.stack, 'test', 'stack')
	t.equal(options.name, 'test1', 'name')
	t.equal(options.image, 'quarry/monnode', 'image')
	t.equal(options.volumes[0], '/var/lib/viking/volumes/test/test1/store:/test1/store', 'volume')

	t.end()

})
