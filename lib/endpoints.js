// the leader runs the registry and the git push
var utils = require('component-consoler');
var EventEmitter = require('events').EventEmitter
var flatten = require('etcd-flatten')

module.exports = {
	registry:registry,
	node:node
}

function getPorts(map){
	return Object.keys(map || {}).map(function(key){
		return map[key]
	})
}

function registry(etcd, done){
	node(etcd, '/core/registry/system', function(err, ports){
		if(err) return done(err)
		ports = getPorts(ports)
		if(ports.length<=0){
			return done('no registry found')
		}
		done(null, ports[0])
	})
}

function node(etcd, nodename, done){
	etcd.get('/ports' + nodename, {
		recursive:true
	}, function(err, data){
		if(err) return done(err)
		done(null, flatten(data.node))
	})
}