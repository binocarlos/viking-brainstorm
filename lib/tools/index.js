var utils = module.exports = {}

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

utils.jobKey =function(base, job){
	var arr = [base, job.stack, job.name, job.id].filter(function(p){
		return p && p.length
	})

	return '/' + arr.join('/')
}