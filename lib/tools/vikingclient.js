var Volume = require('./volume')
var Env = require('./env')

module.exports = function(etcd, config, stackname, done){

	var envStacks = ['core']
	if(stackname!='core'){
		envStacks.push(stackname)
	}
	Env.load(envStacks, function(err, env){
		done(err, {
			etcd:etcd,
			config:config,
			env:env,
			volume:function(path){
				return Volume(config, stackname, path)
			}
		})
	})	
}