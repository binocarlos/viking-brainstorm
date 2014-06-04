var util = require('component-consoler');
var wrench = require('wrench');
var ppath = require('path')

module.exports = function(config, stack, path, mode){
	mode = mode || 'all'

	console.log('-------------------------------------------');
	console.dir(path)

	var parts = path.split(':')

	var localPart = parts[0]
	var remotePart = parts[1] || parts[0]

	localPart = ppath.normalize([config.system.volumes, stack, localPart].join('/'))
	
	try{
		wrench.mkdirSyncRecursive(localPart, 0777);	
	} catch(e){
		util.fatal('directory creation: ' + localPart);
		console.log(e.stack);
	}
	if(mode=='all'){
		return localPart + ':' + remotePart;	
	}
	else if(mode=='local'){
		return localPart
	}
	else if(mode=='remote'){
		return remotePart
	}
	
}