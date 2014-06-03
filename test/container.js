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
var hyperquest = require('hyperquest');
var Volume = require('../lib/tools/volume')
var DockerRun = require('../lib/tools/dockerrun')

var tools = require('./lib/tools')
var state = {}

var tag = new Date().getTime()
function getArgsTest(){
	var vol = Volume(config, 'test', '/test1/store')

	var job =  {
	  stack:'test',
	  name:'test1',
	  tag:tag,
	  image:'quarry/monnode',
	  env:{
	    TEST:10
	  },
	  volumes:[
	    vol
	  ],
	  dockerargs:[
	  	'-m',
	  	'100m'
	  ],
	  entrypoint:'/bin/bash',
	  command:'echo $TEST > /test1/store/env',
	  cwd:'/home'
	}

	var jobObject = Job(job)
	jobObject.ensureValues()

	return jobObject.data()
}

function getJob(){
	var vol = Volume(config, 'test', '/test1/store')

	var job =  {
	  stack:'test',
	  name:'test1',
	  tag:tag,
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


function getServer(){
	
	var job =  {
	  stack:'test',
	  name:'test1',
	  image:'quarry/monnode',
	  tag:tag,
	  env:{
	    TEST:10
	  },
	  volumes:[
	    __dirname + '/simplewebsite:/app'
	  ],
	  ports:[
	    '80'
	  ],
	  entrypoint:'node',
	  command:'index.js',
	  cwd:'/app'
	}

	var jobObject = Job(job)
	jobObject.ensureValues()

	return jobObject.data()
}


tape('dockerrun arguments', function(t){

	var args = DockerRun(getJob())

	t.equal(args.length, 16, 'there are 16 args')

	t.deepEqual(args, [ '-t',
	  '--name',
	  'test-' + tag + '-test1',
	  '-v',
	  '/var/lib/viking/volumes/test/test1/store:/test1/store',
	  '-e',
	  'TEST=10',
	  '--entrypoint',
	  '/bin/bash',
	  '--workdir',
	  '/',
	  'quarry/monnode',
	  'echo',
	  '$TEST',
	  '>',
	  '/test1/store/env' ], 'the args are correct')

	t.end()
})


tape('dockerrun arguments with extra args', function(t){
	var args = DockerRun(getArgsTest())

	t.equal(args.length, 18, 'there are 18 args')

	t.deepEqual(args, [ '-t',
	  '--name',
	  'test-' + tag + '-test1',
	  '-v',
	  '/var/lib/viking/volumes/test/test1/store:/test1/store',
	  '-e',
	  'TEST=10',
	  '--entrypoint',
	  '/bin/bash',
	  '--workdir',
	  '/home',
	  '-m',
	  '100m',
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


tape('run a deamon container - load a page and then close it', function(t){

	var container = Container(getServer())

	function clean(done){

		container.stop(function(){
			container.remove(done)
		})
		
	}


	console.log('clean container')
	clean(function(){

		console.log('start container')
		container.start(function(err, result){

			if(err){
				t.fail(err, 'run the server')
				t.end()
				return
			}

			console.log('get ports')
			container.ports(function(err, ports){

				if(err){
					t.fail(err, 'get the ports')
					t.end()
					return
				}

				var port = ports['80/tcp']

				console.dir('http://127.0.0.1:' + port)

				setTimeout(function(){
					exec('curl -L ' + 'http://127.0.0.1:' + port, function(err, stdout, stderr){

						if(err){
							t.fail(err, 'load the test page')
							t.end()
							return
						}

						stdout = stdout.toString()
						t.ok(stdout.match(/hello world/), 'the result has hello world')
						
						clean(function(){
							t.end()	
						})
					})
				}, 2000)


				
			})
			
		})
	})
	

})


/*
tape('run a container that writes to a volume', function(t){

	var container = Container(getJob())

	function clean(done){

		exec('docker stop test-default-test1 && docker rm test-default-test1', function(){

			setTimeout(done, 1000)
			
		})
	}

	clean(function(){

		container.run(function(err, result){
			console.log('-------------------------------------------');
			console.dir(err)
			console.dir(result)

			
		})
	})
	

})*/