// various tools to get viking running
// mainly used by the bin scripts
var spawn = require('child_process').spawn
var path = require('path')
var fs = require('fs')
var async = require('async')
var utils = require('component-consoler')
var Etcd = require('./services/etcd')
var etcdjs = require('etcdjs')
var config = require('./config')()
var token = require('./tools/etcdtoken')
var Host = require('./services/host')
var Tail = require('tail').Tail
var Docker = require('./docker')
var tools = require('./tools')
var Deployment = require('./deployment')

var Bootstrap = module.exports = {

	boot:function(options){
		options = options || {}
		function writeToken(done){
		  if(!options.seed){
		    return done()
		  }
		  Bootstrap.writeToken(done)
		}

		function startEtcd(done){
		  Bootstrap.startEtcd(program, done)
		}

		function startHost(done){
		  Bootstrap.startHost(done)
		}

		async.series([
			writeToken,
			startEtcd,
			startHost
		], function(){
			process.exit();
		})
	},
	
	writeToken:function getToken(done){

	  if(!config.master){
	    throw new Error('cannot seed a viking server unless it is a master')
	  }

		token(function(err, token){
	    console.log('-------------------------------------------');
	    console.log('writing token')
	    console.dir(config.network.tokenpath)
	    console.dir(token)
	    config.network.token = token
		  fs.writeFileSync(config.network.tokenpath, token, 'utf8')
		  done()
		})
	},

	startEtcd:function startEtcd(options, done){

	  // only run etcd on masters
	  if(!config.master){
	    return done()
	  }

	  utils.log('etcd', 'starting')

	  var etcd = Etcd(config, args, {
	  	stdio:[null, process.stdout, process.stderr]
	  })

	  etcd.on('close', function(){
	  	console.error('etcd has closed')
	  	process.exit(1)
	  })

	  etcd.on('error', function(e){
	  	console.error('etcd has an error: ' + e)
	  	process.exit(1)
	  })

	  setTimeout(done, 1000)
	},

	startHost:function startHost(done){
		Host(config, function(err, host){
	    if(err) return done(err)

	    host.on('running', function(){
	      utils.log('viking-host', 'already running')
	    })

	    host.on('removed', function(){
	      utils.log('viking-host', 'removed old container')
	    })

	    host.on('started', function(){
	      utils.log('viking-host', 'running')
	    })

	    host.start(done)
	  })

	},

	stopStacks:function stopStacks(done){
	  var etcd = etcdjs(config.network.etcd)
	  var deployment = Deployment(config, etcd)

	  deployment.removeServer(config.network.hostname, true, function(err){
	    utils.log('host removed', config.network.hostname)
	    setTimeout(done, 3000)
	  })

	},

	reset:function(done){
    utils.log('reset etcd', 'data');
    Etcd(config, function(err, etcd){
        
      etcd.on('reset', function(path){
        utils.log('remove', path);
      })

      etcd.reset(done);      
    });
	},

	injectEnv:function injectEnv(options, done){
	  
	  if(!fs.existsSync(options.filepath)){
	    return done()
	  }

	  var etcdParts = (config.network.etcd || '127.0.0.1:4001').split(':')

	  var spawnArgs = [
	    __dirname + '/../node_modules/denver/cli.js',
	    '--hostname',
	    etcdParts[0],
	    '--port',
	    etcdParts[1]
	  ].concat([
	    'inject',
	    'vikingcore'
	  ])

	  var envFile = fs.createReadStream(program.filepath, 'utf8')

	  var inject = spawn('node', spawnArgs, {
	    stdio:['pipe', process.stdout, process.stderr]
	  })

	  envFile.pipe(inject.stdin)

	  inject.on('error', done)
	  inject.on('close', done)
	},


	env:function(denverArgs){

		denverArgs = denverArgs || []
		var etcdParts = (config.network.etcd || '127.0.0.1:4001').split(':')

		var spawnArgs = [
			__dirname + '/../node_modules/denver/cli.js',
			'--hostname',
			etcdParts[0],
			'--port',
			etcdParts[1]
		].concat(denverArgs)

		spawn('node', spawnArgs, {
		  stdio:'inherit'
		})
	},

	etcd:function(args){

		args = args || []
		var spawn = require('child_process').spawn

		spawn('etcdctl', args, {
		  stdio:'inherit'
		})
	}
}