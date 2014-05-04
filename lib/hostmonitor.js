// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Container = require('./container')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var PingStat = require('pingstat')

// keeps the entry in /host fresh
module.exports = function(config, etcd){
	var count = 0
	var vikingHostname = config.network.hostname
	var key = '/host/' + vikingHostname
	var entry = {name:vikingHostname, key:key, destroyed:false, timeout:null};
	var stats = PingStat({
		delay:0,
		interval:2000
	})

	stats.on('stat', function(stats){
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.dir('stats!')
		console.dir(stats)
		entry.stats = stats
	})

	var update = function(cb) {

		if(count<3){
			count++
			console.log('-------------------------------------------');
			console.log('write')
			console.dir(key)
			console.dir(entry)

			etcd.set(key, JSON.stringify(entry), {ttl:10}, cb);	
		}
		
	}

	var loop = function() {
		update(function(err) {
			if (entry.destroyed) return;
			entry.timeout = setTimeout(loop, err ? 15000 : 5000);
		});
	};

	var monitor = new EventEmitter()

	monitor.start = function(done){
		update(function(err){
			if(err){
				return done(err)
			}
			entry.timeout = setTimeout(loop, 5000);
			done()
		})

		stats.start()
	}

	monitor.stop = function(done){
		if(entry.timeout){
			clearTimeout(entry.timeout)
		}
		etcd.del(key, done);
		stats.stop()
	}

	return monitor
}