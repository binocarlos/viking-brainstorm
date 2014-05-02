// this runs on all vikings with an etcd client to listen for events
var etcdjs = require('etcdjs')
var config = require('./config')()
var utils = require('component-consoler');

module.exports = function(etcdhosts){
	var store = etcdjs(etcdhosts)

	var vikingHostname = config.network.hostname

	var leaderRunning = false

	// this will be trigged in another viking master if the etcd leadership changes
	function runLeader(){
		if(leaderRunning) return
		utils.log('leader', 'starting')
		leaderRunning = true
		var leader = require('./modules/leader')(config)
		leader.start(function(){
			console.log('leader running');
		})
	}

	function masterLoop(){
		store.stats.self(function(err, stats){
			if(stats.leaderInfo.leader==vikingHostname){
				runLeader()
			}
			setTimeout(masterLoop, 5000)
		})
	}

	function slaveLoop(){
		store.wait('/jobs/' + vikingHostname, {
			recursive: true
		}, function onchange(err, result, next) {
	    console.log('-------------------------------------------');
	    console.log('-------------------------------------------');
	    console.log('HAVE A JOB!');
	    console.dir(result);
	    next()
		})
	}
	


	if(config.master){
		masterLoop()	
	}

	if(config.slave){
		slaveLoop()
	}
}
