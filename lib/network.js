// the leader runs the registry and the git push
var utils = require('component-consoler');
var EventEmitter = require('events').EventEmitter

module.exports = function(config, etcd){

	var network = new EventEmitter()
	network.hosts = {}

	function addHost(host){
		console.log('add')
		console.dir(host)
		etcd.get('/host/' + host, function(err, data){
			if(err){
				return
			}
			var value = JSON.parse(data.node.value)
			network.hosts[host] = value
		})
		//network.hosts[host] = data
		//network.emit('add', host, data)
	}

	function removeHost(host){
		console.log('-------------------------------------------');
		console.log('remove host')
		console.dir(host)
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

			console.log('-------------------------------------------');
			console.log('initial')
			console.dir(data)
			data.node.nodes.forEach(function(node){
				var host = getHostFromKey(node.key)
				addHost(host)
			})

		})

		etcd.wait('/host', {
			recursive:true
		}, function onHost(err, data, next){
			console.log('-------------------------------------------');
			console.log('jhost')
			console.dir(err)
			console.dir(data)

			if(err){
				console.error(err)
				return
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

		console.log('-------------------------------------------');
		console.log('start network')

		listenHosts()
		
		setTimeout(function(){
			done && done()	
		}, 100)
		
	}

	return network

}