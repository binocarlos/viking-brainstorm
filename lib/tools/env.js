var fs = require('fs')
var spawn = require('child_process').spawn
var path = require('path')
var denver = require('denver')
var async = require('async');
var config = require('../config')()
var concat = require('concat-stream')

var Env = module.exports = {
	process:function(obj, done){

		var stacks = {}
		
		Object.keys(obj || {}).forEach(function(key){
			var val = obj[key]
			var match = val.match(/^_(\w+):/)
			if(match){
				var name = match[1]
				stacks[name] = true
			}
		})

		var stackNames = Object.keys(stacks || {})

		async.forEach(stackNames, function(name, nextName){
			Env.load(name, function(err, stack){
				if(err) return nextName(err)
				stacks[name] = stack
				nextName()
			})
		}, function(err){
			if(err) return done(err)

			var ret = {}

			Object.keys(obj || {}).forEach(function(key){
				var val = obj[key]
				var match = val.match(/^_(\w+):(.*?)$/)
				if(match){
					var name = match[1]
					var field = match[2]
					var stack = stacks[name]
					val = stack[field]
				}
				ret[key] = val

				if(!val){
					delete(ret[key])
				}
			})

			done(null, ret)
		})
		
	},
	load:function loadEnv(stacks, done){
		var parts = (config.network.etcd[0] || '127.0.0.1:4001').split(':')
		var den = denver({
			host:parts[0],
			port:parts[1],
			key:'/denver'
		});
	  den.env(stacks, done)
	},
	inject:function injectEnv(options, done){
	  
	  if(!fs.existsSync(options.filepath)){
	    return done()
	  }

	  var etcdParts = (config.network.etcd[0] || '127.0.0.1:4001').split(':')

	  var spawnArgs = [
	    __dirname + '/../../node_modules/denver/cli.js',
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
		var etcdParts = (config.network.etcd[0] || '127.0.0.1:4001').split(':')

		var spawnArgs = [
			__dirname + '/../../node_modules/denver/cli.js',
			'--hostname',
			etcdParts[0],
			'--port',
			etcdParts[1]
		].concat(denverArgs)

		spawn('node', spawnArgs, {
		  stdio:'inherit'
		})
	}
}