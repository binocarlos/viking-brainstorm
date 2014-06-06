// the leader runs the registry and the git push
var EventEmitter = require('events').EventEmitter
var flatten = require('etcd-flatten')
var async = require('async')

module.exports = {
	registry:registry,
	endpoint:endpoint,
	node:node,
	writeEndpoint:writeEndpoint,
	writeDockerEndpoint:writeDockerEndpoint
}

function writeDockerEndpoint(etcd, settings, done){

	var container = settings.container
	var ip = settings.ip
	var job = settings.job

	if(!container){
		return done('no container')
	}

	var ports = container.NetworkSettings.Ports

	async.forEach(Object.keys(ports || {}), function(port, nextPort){
		writeEndpoint(etcd, job, {
			name:port,
			ip:ip,
			ports:ports[port]
		}, nextPort)
	}, done)
}

function writeEndpoint(etcd, job, opts, done){
	var parts = opts.name.split('/')
	var containerPort = parts[0]
	var proto = parts[1]
	var ip = opts.ip
	if(opts.ports && opts.ports.length){
		var val = opts.ports[0]
		var hostPort = val.HostPort
		var portKey = '/ports/' + job.stack + '/' + job.tag + '/' + job.name + '/' + job.pid + '/' + containerPort + '/' + proto + '/' + ip + '/' + hostPort
		var endpoint = ip + ':' + hostPort
		etcd.set(portKey, endpoint, done)
	}
	else{
		done()
	}
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
	endpoint(etcd, '/core/default/registry', done)
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