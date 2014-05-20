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

module.exports = {
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

	startetcd:function startEtcd(options, done){

	  // only run etcd on masters
	  if(!config.master){
	    return done()
	  }

	  var etcdConfig = tools.copy(config)

	  etcdConfig.tail = options.tail
	  Etcd(etcdConfig, function(err, etcd){

	    if(err) return done(err)

	    etcd.on('running', function(){
	      utils.log('etcd', 'already running')
	    })

	    etcd.on('removed', function(){
	      utils.log('etcd', 'removed old container')
	    })

	    etcd.on('started', function(){
	      utils.log('etcd', 'running')
	    })

	    etcd.start(function(){
	      setTimeout(done, 1000)
	    })
	  })

	},


	stopEtcd:function stopEtcd(done){
	  if(!config.master){
	    return done()
	  }
	  Etcd(config, function(err, etcd){
	    if(err) return done(err)

	    etcd.on('stopped', function(){
	      utils.log('etcd', 'stopped')
	    })

	    etcd.on('alreadystopped', function(){
	      utils.log('etcd', 'already stopped')
	    })

	    etcd.stop(done)
	  });

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


	stopHost:function stopHost(done){

	  Host(config, function(err, host){
	    if(err) return done(err)
	        
	    host.on('stopped', function(){
	      utils.log('viking-host', 'stopped')
	    })

	    host.on('alreadystopped', function(){
	      utils.log('viking-host', 'already stopped')
	    })

	    host.stop(function(){
	      setTimeout(done,100)
	    })
	  })

	},


	stopStacks:function stopStacks(done){
	  if(program.filter && program.filter!='stack'){
	    return done()
	  }
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
	}

	tailLogs:function tailLogs(done){
	  
    Host(config, function(err, host){
      if(err) return done(err)

      var files = host.files()

      if(!fs.existsSync(files.log)){
        utils.error('the viking host is not running - cannot tail')
        return done()
      }
      var tail = new Tail(files.log);

      tail.on("line", function(data) {
        console.log('[host] ' + data)
      });
    })
	},

	tailEtcd:function tailEtcd(done){

    var docker = Docker()

    docker.containerId('core-etcd', function(err, id){

      if(err){
        return utils.error(err)
      }

      id = id.replace(/\W/g, '')

      console.log('-------------------------------------------');
      console.log('-------------------------------------------');
      console.log('attach ' + id)
      var etcdAttach = spawn('docker', [
        'attach',
        id
      ], {
        stdio:[null, process.stdout, process.stderr]
      })

    })
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