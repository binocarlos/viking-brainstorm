// this runs on all vikings with an etcd client to listen for events
var etcdjs = require('etcdjs')
var utils = require('component-consoler');
var Etcd = require('./services/etcd');
var config = require('./config')()


function startEtcd(done){
  var etcd = Etcd(config);

  etcd.on('running', function(){
    utils.log('etcd', 'already running')
  })

  etcd.on('removed', function(){
    utils.log('etcd', 'removed old container')
  })

  etcd.on('started', function(){
    utils.log('etcd', 'running')
  })

  etcd.start(function(){
    setTimeout(done, 1000)
  })
}

module.exports = function(etcdhosts){
	var store = etcdjs(etcdhosts)

	console.log('-------------------------------------------');
	console.dir(config);


	function checkStatus(){
		store.stats.self(function(err, stats){
			console.log('-------------------------------------------');
			console.dir(stats);
		})
	}

	setInterval(checkStatus, 1000)


/*

	store.wait('/v2/leader', function(err, leader, next){
		console.log('-------------------------------------------');
		console.dir(err);
		console.dir(leader);
	})


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
			nextConnectLoop()
		})
		
	}

	connectLoop()
	*/
}
