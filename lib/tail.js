var exec = require('child_process').exec
var spawn = require('child_process').spawn
var async = require('async')

module.exports = function(filter){

	if(!filter || filter=='etcd'){
		var etcd = spawn('sudo', ['supervisorctl', 'tail', '-f', 'viking:etcd'], {
			stdio:[null, 'pipe', null]
		})

		etcd.stdout.on('data', function(data){
			console.log(data.toString())
		})
	}

	if(!filter || filter=='host'){
		var host = spawn('sudo', ['supervisorctl', 'tail', '-f', 'viking:vikinghost'], {
			stdio:[null, 'pipe', null]
		})

		host.stdout.on('data', function(data){
			console.log('[host] ' + data.toString())
		})
	}
	
}