var utils = module.exports = {}
var flatten = require('etcd-flatten')

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
	var arr = [job.stack, job.name, job.id].filter(function(p){
		return p && p.length
	})

  if(base){
    arr.unshift(base)
  }

	return '/' + arr.join('/')
}

utils.flattenResult = flatten