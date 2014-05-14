var spawn = require('child_process').spawn
var exec = require('child_process').exec

module.exports = function(){
	return {
		imageId:function(name, done){
			exec("docker images | grep " + name + " | awk '{print $3}'", function(err, stdout, stderr){
				done(err, (stdout || '').toString())
			})
		}
	}
}