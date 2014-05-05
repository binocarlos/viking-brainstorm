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
var Docker = require('./docker')

function Stack(vikingconfig, dir, opts){
	EventEmitter.call(this);
	this.dir = dir
	this.options = opts || {}
	this.vikingconfig = vikingconfig
	this.configpath = path.normalize(this.dir + '/' + (this.options.config || 'viking.yml'))
	this.vikingfile = VikingFile(this.configpath, this.options)
	this.etcd = etcdjs(vikingconfig.network.etcd)
	this.docker = Docker()
}


util.inherits(Stack, EventEmitter);

Stack.prototype.load = function(done){
	var self = this;
	this.vikingfile.load(function(){
		self.id = self.vikingfile.viking.name
		self._buildOrder = self.vikingfile.data.buildOrder
		self._bootOrder = self.vikingfile.data.bootOrder
		self._images = self.vikingfile.data.images
		self._containers = self.vikingfile.data.containers
		self._websites = self.vikingfile.data.websites
		done()
	})
}

Stack.prototype.build = function(done){
	var self = this;

	utils.log('dev mode', 'booting')
	async.series([

		// load up
		function(next){
			self.load(next)
		},

		function(next){
			endpoints.registry(self.etcd, function(err, location){
				self._registry = location
				next()
			})
		},

		function(next){

			if(self.options.dev){
				self.vikingfile.developmentVolumes(self.dir)	
			}
			
			next()
		},

		// build images
		function(next){

			async.forEachSeries(self._buildOrder, function(name, nextImage){
				self.createImage(name, nextImage)
			}, next)

		}

	], function(err){
		if(err){
			utils.error(err)
			process.exit(1)
		}
		done()
	})
}

Stack.prototype.createImage = function(imageName, done){
	var self = this;
	utils.log('create image', imageName)
	var image = self._images[imageName]
	var opts = opts || {}

	var name = imageName

	if(this.options.dev){
		name += '-dev'
	}
	var builder = Builder({
		stack:self.id,
		node:name,
		folder:self.dir,
		dockerFile:image,
		registry:this._registry
	})

	builder.build(function(err, tag){
		if(err) return done(err)

		var image = self.docker.getImage(name)

	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('pushing image')
	console.dir(name)

		image.push(function(err, data){
			console.log('-------------------------------------------');
			console.log('IMAGE PUSHED!!!!')
			console.dir(data)
		})
	})
}

Stack.prototype.commitImage = function(imageName, done){

}

/*
Stack.prototype.createJobs = function(procName, done){
	var self = this;
	var container = self._containers[procName]
	var scale = container.scale || 1
	var jobs = []
	var opts = opts || {}

	var name = procName

	if(this.options.dev){
		name += '-dev'
		scale = 1
	}
	
	for(var jobid=0; jobid<scale; jobid++){
		jobs.push({
			stack:self.id,
			name:name + '-' + jobid
			
		})
	}
	
	console.dir(jobs)
}
*/

module.exports = function(vikingconfig, dir, config){
	return new Stack(vikingconfig, dir, config)
}