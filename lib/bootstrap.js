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
var Host = require('./host')
var Tail = require('tail').Tail
var Docker = require('./docker')
var tools = require('./tools')
var Deployment = require('./deployment')
var Supervisor = require('./supervisor')

var Bootstrap = module.exports = {

	writeToken:function writeToken(done){

	  if(!config.master){
	    throw new Error('cannot seed a viking server unless it is a master')
	  }

		token(function(err, token){
	    config.network.token = token
		  fs.writeFileSync(config.network.tokenpath, token, 'utf8')
		  utils.log('token created', token)
			utils.log('token saved', config.network.tokenpath)
		  done()
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
	  var cmd = 'viking host'
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

	applySupervsior:function applySupervsior(done){
		var supervisor = Supervisor()
		supervisor.apply(done)
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
				Bootstrap.applySupervsior(next)
		  }
		], done)
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

	etcdctl:function(args){

		args = args || []
		var spawn = require('child_process').spawn

		spawn('etcdctl', args, {
		  stdio:'inherit'
		})
	}
}