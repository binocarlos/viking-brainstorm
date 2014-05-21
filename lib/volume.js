var util = require('component-consoler');
var wrench = require('wrench');

module.exports = function(config, stack, path, mode){
	mode = mode || 'all'
	var local_path = [config.system.volumes, stack].join('/') + path;
	
	try{
		wrench.mkdirSyncRecursive(local_path, 0777);	
	} catch(e){
		util.fatal('directory creation: ' + local_path);
		console.log(e.stack);
	}
	if(mode=='all'){
		return local_path + ':' + path;	
	}
	else if(mode=='local'){
		return local_path
	}
	else if(mode=='remote'){
		return path
	}
	
}