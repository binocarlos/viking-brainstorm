var yaml = require('js-yaml')
var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var VikingFile = require('./vikingfile')
var Builder = require('./builder')
var async = require('async')
var utils = require('component-consoler')
var etcdjs = require('etcdjs')
var endpoints = require('./endpoints')
var spawn = require('child_process').spawn
var tools = require('./tools')
var ImageBank = require('./imagebank')

function Stack(vikingconfig, dir, opts){
	EventEmitter.call(this);
	this.dir = dir
	this.options = opts || {}
	this.vikingconfig = vikingconfig
	this.configpath = path.normalize(this.dir + '/' + (this.options.config || 'viking.yml'))
	this.vikingfile = VikingFile(this.configpath, this.options)
	this.etcd = etcdjs(vikingconfig.network.etcd)
	this.tag = this.options.tag || 'default'// || tools.littleid()
	this.builders = {}
	this.imagebank = ImageBank(vikingconfig, this.etcd)
}

util.inherits(Stack, EventEmitter);

Stack.prototype.load = function(done){
	var self = this;
	if(this._loaded){
		return done()
	}
	this._loaded = true

	async.series([
		function(next){
			endpoints.registry(self.etcd, function(err, registry){
				self.registry = registry
				if(self.options.registry){
					self.registry = self.options.registry
				}
				next()
			})
		},

	  function(next){
			self.vikingfile.load(function(){
				self.id = self.vikingfile.viking.name
				self._buildOrder = self.vikingfile.data.buildOrder || []
				self._bootOrder = self.vikingfile.data.bootOrder || []
				self._images = self.vikingfile.data.images
				self._containers = self.vikingfile.data.containers
				self._websites = self.vikingfile.data.websites
				// this alters the viking file ready for mounting volumes pointing to the code
				// this lets the user change the code (like HTML) whilst the container is running
				if(self.options.dev){
					self.vikingfile.developmentVolumes(self.dir)	
				}
				next()
			})
	  },

	  function(next){
	  	self._buildOrder.forEach(function(name){

	  		self.builders[name] =  Builder({
					stack:self.id,
					node:name,
					tag:self.tag,
					folder:self.dir,
					dockerFile:self._images[name],
					registry:self.registry
				}, self.etcd)
	  	})

	  	next()
	  }
	], done)
	
}


Stack.prototype.build = function(done){
	var self = this;

	utils.log('stack', 'build')
	async.series([

		// load up the viking file
		function(next){
			self.load(next)
		},

		// build images
		function(next){

			async.forEachSeries(self._buildOrder, function(name, nextImage){

				var builder = self.builders[name]
				builder.build(nextImage)

			}, next)

		},

		// push images
		function(next){
			
			async.forEachSeries(self._buildOrder, function(name, nextImage){

				var builder = self.builders[name]
				builder.push(nextImage)

			}, next)
		},

		// save images to etcd
		function(next){
			
			async.forEachSeries(self._buildOrder, function(name, nextImage){

				var builder = self.builders[name]
				self.imagebank.saveImage(builder.saveImageName(), builder.remoteName(), nextImage)

			}, next)
		},

		// cleanup
		function(next){

			async.forEachSeries(self._buildOrder, function(name, nextImage){


				var builder = self.builders[name]

				builder.cleanup(nextImage)
				

			}, next)
		}
		
	], function(err){
		if(err){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('ERROR')
			console.log(err.toString())
			process.exit(1)
		}
		done()
	})
}


Stack.prototype.buildImage = function(imageName, done){
	var self = this;
	utils.log('create image', imageName)
	var image = self._images[imageName]
	var opts = opts || {}

	var name = this.tag + '-' + imageName

	endpoints.registry(self.etcd, function(err, registry){
		if(self.options.registry){
			registry = self.options.registry
		}
		var builder = Builder({
			stack:self.id,
			node:name,
			tag:self.tag,
			folder:self.dir,
			dockerFile:image,
			registry:registry
		}, self.etcd)

		builder.build(done)
	})
}

Stack.prototype.pushImage = function(imageName, done){

	var push = spawn('docker', [
		'push',
		imageName
	], {
		stdio:'inherit'
	})

	push.on('error', done)
	push.on('close', done)
}


module.exports = function(vikingconfig, dir, config){
	return new Stack(vikingconfig, dir, config)
}