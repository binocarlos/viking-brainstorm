var async = require('async')
var flatten = require('etcd-flatten')
var EventEmitter = require('events').EventEmitter
var logger = require('../tools/logger')

module.exports = function(config, etcd){


  function getLeader(done){
    etcd.stats.leader(function(err, stats){
      if(err) return done(err)
      if(!stats) return done('no data')
      return done(null, stats.leader)
    })
  }

	return function(done){
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

			deploy:function(next){
				etcd.get('/deploy', {
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

			log:function(next){
				etcd.get('/log', {
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


			ports:function(next){
				etcd.get('/ports', {
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

			leader:getLeader

		}, function(err, data){
			if(err){
				return done(err)
			}

			done(null, {
				leader:data.leader,
				proc:processObject(data.proc, function(key){
					return key.replace(/^\/proc/, '')
				}),
				deploy:processStringObject(data.deploy, function(key){
					return key.replace(/^\/deploy/, '')
				}),
				log:processStringObject(data.log, function(key){
					return key.replace(/^\/log/, '')
				}),
				ports:processStringObject(data.ports, function(key){
					return key.replace(/^\/ports/, '')
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
