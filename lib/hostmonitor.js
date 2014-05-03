// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var Container = require('./container')
var EventEmitter = require('events').EventEmitter
var util = require('util')

module.exports = function(config, etcd){

	// ttl the /host/hostname key

	var vikingHostname = config.network.hostname
	var key = '/host/' + vikingHostname
	var entry = {name:vikingHostname, key:key, destroyed:false, timeout:null};

	var update = function(cb) {
		etcd.set(key, entry, {ttl:10}, cb);
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
	}

	monitor.stop = function(done){
		if(entry.timeout){
			clearTimeout(entry.timeout)
		}
		etcd.del(key, done);
	}

	return monitor

	/*

		var key = prefix(normalize(name)+'/'+sha1(name+'-'+service.url));
		var value = JSON.stringify(service);
		var entry = {name:name, key:key, destroyed:false, timeout:null};

		var update = function(cb) {
			store.set(key, value, {ttl:10}, cb);
		};

		var loop = function() {
			update(function(err) {
				if (entry.destroyed) return;
				entry.timeout = setTimeout(loop, err ? 15000 : 5000);
			});
		};

		var onerror = function(err) {
			leave([entry], function() {
				cb(err);
			});
		};

		services.push(entry);
		update(function(err) {
			if (err) return onerror(err);
			if (destroyed) return onerror(new Error('registry destroyed'));

			entry.timeout = setTimeout(loop, 5000);
			cb(null, service);
		});*/
}