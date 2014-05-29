// various tools to get viking running
// mainly used by the bin scripts
var spawn = require('child_process').spawn
var exec = require('child_process').exec
var path = require('path')
var fs = require('fs')
var async = require('async')
var utils = require('component-consoler')
var Etcd = require('./services/etcd')
var etcdjs = require('etcdjs')
var config = require('./config')()
var token = require('./tools/etcdtoken')
var Host = require('./host')
var tools = require('./tools')
var Deployment = require('./deployment')
var Supervisor = require('./supervisor')
var Tail = require('./tail')
var wrench = require('wrench')

var Bootstrap = module.exports = {

	start:function(done){
		var supervisor = Supervisor()
		supervisor.start(done)
	},

	stop:function(done){
		var supervisor = Supervisor()
		Bootstrap.stopStacks(function(){
			supervisor.stop(done)	
		})
	},

	tail:function(filter){

		Tail(filter)
		
	},

/*
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

	startEtcd:function startEtcd(done){

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


	stopEtcd:function stopEtcd(done){

		exec('docker ps | grep etcd', function(err, stdout){
			if(stdout && stdout.toString().match(/etcd/)){
				exec('docker stop core-etcd && docker rm core-etcd', done)
			}
			else{
				return done('not running')
			}
		})
		
	},

	// write the etcd supervisor file to /etc/
	writeEtcd:function writeEtcd(options, done){

	  // only run etcd on masters
	  if(!config.master){
	    return done()
	  }

	  function writeSupervisor(){
		  var args = Etcd(config)
		  args.unshift('etcd')
		  var cmd = args.join(' ')
		  var supervisor = Supervisor()
		  utils.log('etc', cmd)
		  supervisor.writeProgram('etcd', cmd, done)
	  }

	  function writeToken(tdone){
	  	if(!options.seed){
		    return tdone()
		  }
		  Bootstrap.writeToken(tdone)
	  }

	  writeToken(function(){
	  	writeSupervisor(done)
	  })

	},

	writeVikingHost:function writeHost(done){
		var scriptPath = path.normalize(__dirname + '/../bin/viking-host')
	  var cmd = 'node ' + scriptPath
	  var supervisor = Supervisor()
	  utils.log('vikinghost', cmd)
	  supervisor.writeProgram('vikinghost', cmd, done)
	},

	// write the supervisor group for 'viking' (etcd,vikinghost)
	writeVikingGroup:function writeVikingGroup(done){
		var supervisor = Supervisor()
		var programs = ['etcd', 'vikinghost']
	  utils.log('viking group', ['etcd', 'vikinghost'].join(', '))
	  supervisor.writeGroup('viking', ['etcd', 'vikinghost'], done)
	},

	writeSupervisor:function writeSupervisor(options, done){
		async.series([
		  function(next){
				Bootstrap.writeEtcd(options, next)
		  },
		  function(next){
				Bootstrap.writeVikingHost(next)
		  },
		  function(next){
				Bootstrap.writeVikingGroup(next)
		  },
		  function(next){
		  	exec('sudo supervisorctl reread', next)
		  }
		], done)
	},
	*/

	stopStacks:function stopStacks(done){
	  var etcd = etcdjs(config.network.etcd)
	  var deployment = Deployment(config, etcd)

	  deployment.removeServer(config.network.hostname, true, function(err){
	    utils.log('host removed', config.network.hostname)
	    setTimeout(done, 3000)
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

	etcdctl:function(args){

		args = args || []
		var spawn = require('child_process').spawn

		spawn('etcdctl', args, {
		  stdio:'inherit'
		})
	}
}