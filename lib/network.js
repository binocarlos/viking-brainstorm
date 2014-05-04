// the leader runs the registry and the git push
var utils = require('component-consoler');
var EventEmitter = require('events').EventEmitter

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
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('REMOVE HOST')
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


	network.start = function(done){

		listenHosts()
		
		setTimeout(function(){
			done && done()	
		}, 100)
		
	}

	return network

}