var config = require('../lib/config')()
var tape     = require('tape')
var tools = require('./lib/tools')
var etcdjs = require('etcdjs')
var Job = require('../lib/tools/job')
var flatten = require('etcd-flatten')
var etcdserver = tools.etcd()
var Dispatch = require('../lib/deployment/dispatch')
var Schedule = require('../lib/deployment/schedule')
var etcd = etcdjs('127.0.0.1:4001')

var stubwriter = tools.stubwriter()
var schedule = Schedule(config, etcd)

var dispatch = Dispatch(config, etcd)

etcdserver.stop(tape, true)
etcdserver.reset(tape)
etcdserver.start(tape)
tools.pause(tape, 3)
etcdserver.check(tape)

stubwriter.network(etcd, tape)
stubwriter.proc(etcd, schedule, tape)

var loops = []
for(var index=0; index<5; index++){
	loops.push('' + index)
}

loops.forEach(function(i){
	tape('test the proposed allocations number ' + i, function(t){

		dispatch.getAllocations(function(err, allocations){

			if(err){
				t.fail(err, 'load allocations')
				t.end()
				return
			}

			t.equal(allocations.length, 8, 'there are 8 allocations')
			
			var jobServers = {}
			var serverCount = {}

			allocations.forEach(function(allocation){
				var job = allocation.job
				var jobObject = Job(job)
				var server = allocation.server
				jobServers[jobObject.baseId()] = server.name
				serverCount[server.name] = serverCount[server.name] || 0
				serverCount[server.name]++
			})

			t.ok(serverCount['viking-0']>=2 && serverCount['viking-0']<=4, 'fair allocation - viking-0 - pass: ' + i)
			t.ok(serverCount['viking-1']>=2 && serverCount['viking-1']<=3, 'fair allocation - viking-1 - pass: ' + i)
			t.ok(serverCount['viking-2']>=2 && serverCount['viking-2']<=3, 'fair allocation - viking-2 - pass: ' + i)

			t.equal(jobServers['core-default-registry'], 'viking-0', 'the registry is allocated to viking 0')
			t.equal(jobServers['test-default-test1'], 'viking-0', 'the test1 is allocated to viking-0')
			
			t.end()
		})
	})

})


etcdserver.stop(tape)