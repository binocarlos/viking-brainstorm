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


tape('get the docker arguments', function(t){

	var job = Registry(config)
	var jobObject = Job(job)
	jobObject.ensureValues()

	var container = Container(job)
	
	var options = container.options()

	console.dir(options)
	t.end()
  

})
