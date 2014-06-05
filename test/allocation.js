var config = require('../lib/config')()
var tape     = require('tape')
var tools = require('./lib/tools')
var etcdjs = require('etcdjs')
var stubs = require('./lib/stubs')
var flatten = require('etcd-flatten')
var etcdserver = tools.etcd()
var Deployment = require('../lib/deployment')
var etcd = etcdjs('127.0.0.1:4001')

var stubs = tools.stubs()
var deployment = Deployment(config, etcd)

etcdserver.reset(tape)
etcdserver.start(tape)
tools.pause(tape, 1)
etcdserver.check(tape)

function processObject(obj, map){
	var ret = {}
	Object.keys(obj || {}).forEach(function(key){				
		var mapkey = map(key)
		ret[mapkey] = JSON.parse(obj[key])
	})
	return ret
}

stubs.network(tape)
stubs.proc(tape)

var loops = []
for(var index=0; index<5; index++){
	loops.push('' + index)
}

loops.forEach(function(i){
	tape('test the proposed allocations number ' + i, function(t){

		deployment.getAllocations(function(err, allocations){

			if(err){
				t.fail(err, 'load allocations')
				t.end()
				return
			}

			t.equal(allocations.length, 8, 'there are 8 allocations')
			
			var jobs = {}
			var jobServers = {}
			var serverCount = {}

			allocations.forEach(function(allocation){
				var job = allocation.job
				var server = allocation.server
				jobs[job.id] = job
				jobServers[job.id] = server.name
				serverCount[server.name] = serverCount[server.name] || 0
				serverCount[server.name]++
			})

			console.log(JSON.stringify(serverCount, null, 4))
			t.ok(serverCount['viking-0']>=2 && serverCount['viking-0']<=4, 'fair allocation - viking-0 - pass: ' + i)
			t.ok(serverCount['viking-1']>=2 && serverCount['viking-1']<=3, 'fair allocation - viking-1 - pass: ' + i)
			t.ok(serverCount['viking-2']>=2 && serverCount['viking-2']<=3, 'fair allocation - viking-2 - pass: ' + i)

			t.equal(jobServers['core/default/registry'], 'viking-0')
			t.equal(jobServers['test/default/test1'], 'viking-0')
			
			t.end()
		})
	})

})

etcdserver.stop(tape)