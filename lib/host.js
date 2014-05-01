// this runs on all vikings with an etcd client to listen for events
var etcdjs = require('etcdjs')
var utils = require('component-consoler');
var config = require('../lib/config')()

module.exports = function(etcdhosts){
	var store = etcdjs(etcdhosts)

	var blankInfoCount = 0
	function connectLoop(){

		function nextConnectLoop(){
			setTimeout(connectLoop, 1000)
		}

		store.stats.leader(function(err, stats){

			if(!stats){
				blankInfoCount++
			}

			if(blankInfoCount>=5){
				console.error('error connecting to local etcd host')
			}
			console.dir(stats);
			nextLoop()
		})
		
	}

	connectLoop()
}
