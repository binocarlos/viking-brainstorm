var spawn = require('child_process').spawn
var Etcd = require('../services/etcd')
var wrench = require('wrench');
var fs = require('fs')
var request = require('request')
var exec = require('child_process').exec
var token = require('../tools/etcdtoken')
var config = require('../config')()

var etcd = module.exports = {

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
		  console.log('[token created] ' + token)
			console.log('[token saved] ' + config.network.tokenpath)
		  done && done(null, token)
		})
	},

	
	reset:function(args, done){
		var dataFolder = Etcd.volume(config).split(':')[0]
		if(args.folder){
			dataFolder = args.folder
		}
    wrench.rmdirSyncRecursive(dataFolder, true)
    wrench.mkdirSyncRecursive(dataFolder)
    exec('sudo chown -R viking:viking ' + dataFolder, function(){
    	exec('sudo chmod 775 ' + dataFolder, function(){
    		exec('docker rm core-etcd', function(){
    			console.log('[reset etcd] ' + dataFolder)	
    		})
    	})
    })
    
	},

	tail:function tailEtcd(done){
		/*
		var logs = spawn('docker', [
			'logs',
			'core-etcd'
		], {
			stdio:'inherit'
		})*/

		var attach = spawn('docker', [
			'attach',
			'core-etcd'
		], {
			stdio:'inherit'
		})
	},

	start:function startEtcd(etcdargs, done){

		exec('docker ps | grep etcd', function(err, stdout){
			if(stdout && stdout.toString().match(/etcd/)){
				return done('already running')
			}

			var args = Etcd(config, etcdargs)

			console.log('docker ' + args.join(' '))
			
			var etcd = spawn('docker', args, {
				stdio:'inherit'
			})

			etcd.on('error', done)
			etcd.on('close', done)
		})
		
	},


	stop:function stopEtcd(done){

		request({
			url:'http://127.0.0.1:7001/v2/admin/machines/' + config.network.hostname,
			method:'DELETE',
			followAllRedirects:true
		}, function(err, result, body){

			exec('docker ps | grep etcd', function(err, stdout){
				if(stdout && stdout.toString().match(/etcd/)){
					exec('docker stop core-etcd && docker rm core-etcd', function(err, stdout){
						console.log(stdout.toString())
						done(err)
					})
				}
				else{
					return done('not running')
				}
			})
		})

		
	},

	boot:function(args){

		function start(done){
		  etcd.start(args, function(err){
		    if(err){
		      console.log(err)
		      process.exit(0)
		    }
		    if(args.tail){
		      etcd.tail()
		    }
		    else{
		    	done && done()	
		    }
		    
		  })  
		}

		function writeToken(done){
		  etcd.writeToken(function(err, token){
		    if(err){
		      console.log(err)
		      process.exit(0)
		    }
		    console.log(token)
		    done()
		  })
		}

		function seed(done){
		  if(args.seed){
		    writeToken(done)
		  }
		  else{
		    done()
		  }
		}


		var cmd = args._[3]

		if(cmd=='start'){
		  seed(function(){
		    start(function(){
		    	process.exit(0)
		    })
		  })
		}
		else if(cmd=='stop'){
		  etcd.stop(function(err){
		    if(err){
		      console.log(err)
		      process.exit(0)
		    }
		    process.exit(0)
		  })
		}
		else if(cmd=='reset'){
		  etcd.reset(args, function(){

		  })
		}
		else if(cmd=='tail'){
		  etcd.tail(function(){

		  })
		}
	}
}