var spawn = require('child_process').spawn
var exec = require('child_process').exec

module.exports = function(){
	return {
		imageId:function(name, done){
			exec("docker images | grep " + name + " | awk '{print $3}'", function(err, stdout, stderr){
				if(err || stderr){
					return done(err || stderr)
				}

				var id = stdout.toString().replace(/\W/g, '')
				
				done(err, id)
			})
		},
		containerId:function(name, done){
			exec("docker ps | grep " + name + " | awk '{print $1}'", function(err, stdout, stderr){
				if(err || stderr){
					return done(err || stderr)
				}

				var id = stdout.toString()
				
				done(err, id)
			})
		}
	}
}