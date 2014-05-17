var utils = module.exports = {}
var flatten = require('etcd-flatten')
var exec = require('child_process').exec
var async = require('async');

utils.littleid = function(chars){

  chars = chars || 6;

  var pattern = '';

  for(var i=0; i<chars; i++){
    pattern += 'x';
  }
  
  return pattern.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

utils.jobKey = function(base, job){
	var arr = [job.stack, job.tag, job.name].filter(function(p){
		return p && p.length
	})

  if(base){
    arr.unshift(base)
  }

	return '/' + arr.join('/')
}

utils.flattenResult = flatten

utils.cleanImages = function(done){
  exec('docker images -notrunc | grep none | awk \'{print $3}\' | xargs -r docker rmi', function(err, stdout, stderr){
    if(err) return done(err)
    console.log(stdout)
    done()
  })
}

utils.cleanContainers = function(done){
  exec('docker ps -a -notrunc | grep \'Exit\' | awk \'{print $1}\' | xargs -r docker rm', function(err, stdout, stderr){
    if(err) return done(err)
    console.log(stdout)
    done()
  })
}

utils.cleanAll = function(done){

  async.series([
    function(next){
      utils.cleanContainers(next)
    },
    function(next){
      utils.cleanImages(next)
    }
  ], done)
}