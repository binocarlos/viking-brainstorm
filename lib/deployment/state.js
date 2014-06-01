// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter

// Because planning - Hugh Dowding (in case you were wandering)
module.exports = function(config, etcd){

	return {
		getState:function(done){
			function processObject(obj, map){
				var ret = {}
				Object.keys(obj || {}).forEach(function(key){				
					var mapkey = map(key)
					ret[mapkey] = JSON.parse(obj[key])
				})
				return ret
			}

			function processStringObject(obj, map){
				var ret = {}
				Object.keys(obj || {}).forEach(function(key){				
					var mapkey = map(key)
					ret[mapkey] = obj[key]
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

				host:function(next){
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
					run:processStringObject(data.run, function(key){
						return key.replace(/^\/run/, '')
					}),
					host:processObject(data.host, function(key){
						return key.replace(/^\/host\//, '').replace(/\/config$/, '')
					})
				})
			})
		}
	}
	
}