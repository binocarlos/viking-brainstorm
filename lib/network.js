// the leader runs the registry and the git push
var utils = require('component-consoler');
var EventEmitter = require('events').EventEmitter
var Job = require('./job')
var Server = require('./server')

module.exports = function(config, etcd){

	var network = new EventEmitter()
	network.hosts = {}

	function addHost(host){
		etcd.get('/host/' + host, function(err, data){
			if(err){
				return
			}
			var value = JSON.parse(data.node.value)

			if(!network.hosts[host]){
				network.emit('add', host, value)
			}
			else{
				network.emit('update', host, value)	
			}
			network.hosts[host] = value
		})
	}

	function removeHost(host){
		delete(network.hosts[host])
		network.emit('remove', host)
	}

	function getHostFromKey(key){
		return key.replace(/^\/host\//, '')
	}

	function listenHosts(){
		etcd.get('/host', {
			recursive:true
		}, function(err, data){
			data.node.nodes.forEach(function(node){
				var host = getHostFromKey(node.key)
				addHost(host)
			})
		})

		etcd.wait('/host', {
			recursive:true
		}, function onHost(err, data, next){
			if(err){
				console.error(err)
				return
			}
			if(!data){
				return next(onHost)
			}
			var host = getHostFromKey(data.node.key)
			if(data.action=='set'){
				addHost(host)
			}
			else if(data.action=='expire'){
				removeHost(host)
			}
			else if(data.action=='del'){
				removeHost(host)
			}
			return next(onHost)
		})
	}

	function filterHost(job, host){
		console.log('-------------------------------------------');
		console.log('FILTER')
		console.dir(job)
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log(JSON.stringify(host, null, 4))
		return false
	}

	// find a server for this job
	network.filter = function(job){
		var jobObject = Job(job)
		var servers = []
		return Object.keys(network.hosts || {}).filter(function(key){
			var host = network.hosts[key]
			return filterHost(jobObject, host)
		}).map(function(key){
			return network.hosts[key]
		})
	}

	network.start = function(done){

		listenHosts()
		
		setTimeout(function(){
			done && done()	
		}, 100)
		
	}

	return network

}