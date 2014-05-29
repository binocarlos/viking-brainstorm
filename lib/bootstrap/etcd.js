var spawn = require('child_process').spawn
var Etcd = require('../services/etcd')
var wrench = require('wrench');
var fs = require('fs')
var utils = require('component-consoler');
var exec = require('child_process').exec
var token = require('../tools/etcdtoken')
var config = require('../config')()

var Bootstrap = module.exports = {

	getToken:function getToken(done){
		token(done)
	},

	writeToken:function writeToken(done){

	  if(!config.master){
	    throw new Error('cannot seed a viking server unless it is a master')
	  }

		token(function(err, token){
	    config.network.token = token
		  fs.writeFileSync(config.network.tokenpath, token, 'utf8')
		  //utils.log('token created', token)
			//utils.log('token saved', config.network.tokenpath)
		  done && done(null, token)
		})
	},

	
	reset:function(done){
    var dataFolder = Etcd.volume(config).split(':')[0]
    wrench.rmdirSyncRecursive(dataFolder, true)
    wrench.mkdirSyncRecursive(dataFolder)
    exec('sudo chown -R viking:viking ' + dataFolder, function(){
    	exec('sudo chmod 775 ' + dataFolder, function(){
    		utils.log('reset etcd', dataFolder)	
    	})
    })
    
	},

	tail:function tailEtcd(done){
		var etcd = spawn('docker', [
			'tail',
			'core-etcd'
		], {
			stdio:'inherit'
		})
	},

	start:function startEtcd(done){

		exec('docker ps | grep etcd', function(err, stdout){
			if(stdout && stdout.toString().match(/etcd/)){
				return done('already running')
			}

			var args = Etcd(config)
			
			var etcd = spawn('docker', args, {
				stdio:'inherit'
			})

			etcd.on('error', done)
			etcd.on('close', done)
		})
		
	},


	stop:function stopEtcd(done){

		exec('docker ps | grep etcd', function(err, stdout){
			if(stdout && stdout.toString().match(/etcd/)){
				exec('docker stop core-etcd && docker rm core-etcd', done)
			}
			else{
				return done('not running')
			}
		})
		
	}
}