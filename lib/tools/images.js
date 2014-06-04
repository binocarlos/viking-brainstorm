// the leader runs the registry and the git push
module.exports = {
	saveImage:saveImage
}

function saveImage(etcd, path, value, done){
	etcd.set('/images/' + path, value, done)
}