// this runs on all vikings with an etcd client to listen for events
var exec = require('child_process').exec
var async = require('async')

module.exports = function(opts){

	function startEtcd(done){
		var seed = opts.seed ? ' --seed' : ''
		var folder = opts.folder ? ' --folder ' + opts.folder
		exec('viking etcd start' + seed + folder, function(err, stdout){
			if(err){
				return done(err)
			}
			console.log(stdout.toString())
			setTimeout(done, 1000)
		})
	}

	function startHost(done){
		exec('viking host start -d', function(err, stdout){
			if(err){
				return done(err)
			}
			console.log(stdout.toString())
			done()
		})
	}

	function stopEtcd(done){
		exec('viking etcd stop', function(err, stdout){
			if(err){
				return done(err)
			}
			console.log(stdout.toString())
			done()
		})
	}

	function stopHost(done){
		var clean = opts.clean ? ' --clean' : ''
		exec('viking host stop ' + clean, function(err, stdout){
			if(err){
				return done(err)
			}
			console.log(stdout.toString())
			setTimeout(done, 1000)
		})	
	}

	var controller = {
		start:function(done){

			async.series([
				function(next){
					startEtcd(next)
				},

				function(next){
					startHost(next)
				}
			], done)

		},
		// stop and remove all jobs that are running on this host
		stop:function(done){
			
			async.series([
				function(next){
					stopHost(next)
				},

				function(next){
					stopEtcd(next)
				}
			], done)
		}
	}
	return controller	
}
