var spawn = require('child_process').spawn
var exec = require('child_process').exec
var tape     = require('tape')

tape('initialize', function(t){
	var start = spawn('viking', [
		'start',
		'--seed'
	], {
		stdio:'inherit'
	})

	start.on('error', function(e){
		throw new Error(e)
	})

	start.on('close', function(){

		setTimeout(function(){
			exec('docker ps', function(err, stdout, stderr){
				if(err || stderr){
					throw new Error(stderr)
				}

				var content = stdout.toString()

				// we should have a registry and etcd running

				t.ok(content.match(/etcd/, 'etcd running')
				t.ok(content.match(/core-registry-system/, 'registry running')



				console.log('-------------------------------------------');
				console.log('-------------------------------------------');
				console.dir(stdout)
				t.end()

			})
		},5000)
		
	})
})

tape('boot a simple stack', function(t){

	t.end()
  

})


tape('shutdown', function(t){

	var stop = spawn('viking', [
		'stop'
	], {
		stdio:'inherit'
	})

	stop.on('error', function(e){
		throw new Error(e)
	})

	stop.on('close', function(){
		t.end()
	})
  

})