// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var flatten = require('etcd-flatten')

var EventEmitter = require('events').EventEmitter

// Because planning - Hugh Dowding (in case you were wandering)
module.exports = function(etcd, done){

	function processObject(obj, map){
		var ret = {}
		Object.keys(obj || {}).forEach(function(key){
			key = map(key)
			ret[key] = JSON.parse(proc.value)
		})
		return ret
	}

	async.parallel({
		proc:function(next){
			etcd.get('/proc', {
				recursive:true
			}, function(err, data){
				if(err){
					return next(err)
				}
				if(!data){
					return next();
				}
				next(null, flatten(data.node))
			})
		},
		
		run:function(next){
			etcd.get('/run', {
				recursive:true
			}, function(err, data){
				if(err){
					return next()
				}
				if(!data){
					return next();
				}
				next(null, flatten(data.node))
			})
		},

		network:function(next){
			etcd.get('/host', {
				recursive:true
			}, function(err, data){
				if(err){
					return next(err)
				}
				if(!data){
					return next();
				}
				next(null, flatten(data.node))
			})
		},
	}, function(err, data){
		if(err){
			return done(err)
		}

		done(null, {
			proc:processObject(data.proc, function(key){
				return key.replace(/^\/proc/, '')
			}),
			run:processObject(data.run, function(key){
				return key.replace(/^\/run/, '')
			}),
			host:processObject(data.run, function(key){
				return key.replace(/^\/host/, '').replace(/\/config$/, '')
			})
		})
	})
}
