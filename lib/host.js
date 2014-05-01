// this runs on all vikings with an etcd client to listen for events
var etcdjs = require('etcdjs')
var utils = require('component-consoler');
var config = require('../lib/config')()

var store = etcdjs('127.0.0.1:4001')


function hostLoop(){

	function nextLoop(){
		setTimeout(hostLoop, 1000)
	}

	store.stats.leader(function(err, stats){
		console.dir(stats);
		nextLoop()
	})
	
}

hostLoop()