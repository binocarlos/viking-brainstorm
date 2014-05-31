// the leader runs the registry and the git push
var utils = require('component-consoler');
var EventEmitter = require('events').EventEmitter
var flatten = require('etcd-flatten')

module.exports = {
	registry:registry,
	endpoint:endpoint,
	node:node
}

function getPorts(map){
	return Object.keys(map || {}).map(function(key){
		return map[key]
	})
}

function endpoint(etcd, path, done){
	node(etcd, path, function(err, ports){
		if(err) return done(err)
		ports = getPorts(ports)
		if(ports.length<=0){
			return done('no registry found')
		}
		done(null, ports[0])
	})
}

function registry(etcd, done){
	endpoint(etcd, '/core/system/registry', done)
}

function node(etcd, nodename, done){
	etcd.get('/ports' + nodename, {
		recursive:true
	}, function(err, data){
		if(err) return done(err)
		if(!data){
			return done()
		}
		done(null, flatten(data.node))
	})
}