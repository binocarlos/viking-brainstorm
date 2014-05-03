module.exports = function(container){
	var self = container;
	container.data(function(err, data){
		if(err){
			return callback(err)
		}
		var id = data.ID
		var ip = self._config.network.private
		var ports = data.NetworkSettings.Ports

		var endpoints = Object.keys(ports || {}).map(function(key){
			var obj = ports[key]
			var parts = key.split('/')
			var containerPort = parts[0]
			var hostPort = obj.HostPort
			return {
				path:'/' + self._options.stack + '/' + self._options.name + '/' + containerPort + '/' + id,
				value:ip + ':' + hostPort
			}
		})


		/*
		
			HERE GOES THE AMABASSADOR THAT CHECKS HTTPS OR TCP (with telnet)

			THIS IS WHAT TTLS the key to etcd and keeps the ping going to HQ
			
		*/

		async.forEach(endpoints, function(endpoint, nextEndpoint){

		}, function(){

		})

		
		console.dir(ports)
		console.dir(self._options)
		console.dir(self._config)
		process.exit()

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('data')
		console.dir(data)
		process.exit()
	})
}