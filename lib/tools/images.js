// the leader runs the registry and the git push
module.exports = {
	saveImage:saveImage,
	localName:localName,
	remoteName:remoteName
}

function saveImage(etcd, path, value, done){
	etcd.set('/images/' + path, value, done)
}

function localName(stack, tag, name, splitter){
	return [stack, tag, name].join(splitter || '-')
}

function remoteName(registry, stack, tag, name){
	return [registry, stack, name].join('/') + ':' + tag
}