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
	var entry = {
		name:vikingHostname,
		key:key,
		destroyed:false,
		config:config
	}
	var timeout = null
	var stats = PingStat({
		delay:1000,
		interval:5000
	})

	stats.on('stat', function(stats){
		entry.stats = stats
	})

	var update = function(cb) {
		etcd.set(key, JSON.stringify(entry), {ttl:10}, cb);	
	}

	var loop = function() {
		update(function(err) {
			if (entry.destroyed) return;
			timeout = setTimeout(loop, err ? 15000 : 5000);
		});
	};

	var monitor = new EventEmitter()

	// flag the meta of this server as the leader
	monitor.leader = function(done){
		entry.leader = true
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.dir(entry)
		update(done)
	}

	monitor.start = function(done){
		update(function(err){
			if(err){
				return done(err)
			}
			timeout = setTimeout(loop, 5000);
			done()
		})

		stats.start()
	}

	monitor.stop = function(done){
		if(timeout){
			clearTimeout(timeout)
		}
		etcd.del(key, done);
		stats.stop()
	}

	return monitor
}