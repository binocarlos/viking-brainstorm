var yaml = require('js-yaml')
var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var VikingFile = require('./vikingfile')
var Builder = require('./builder')
var async = require('async');
var utils = require('component-consoler');
var etcdjs = require('etcdjs')
var endpoints = require('./endpoints')

function Stack(vikingconfig, dir, opts){
	EventEmitter.call(this);
	this.dir = dir
	this.options = opts || {}
	this.vikingconfig = vikingconfig
	this.configpath = path.normalize(this.dir + '/' + (this.options.config || 'viking.yml'))
	this.vikingfile = VikingFile(this.configpath, this.options)
	this.etcd = etcdjs(vikingconfig.network.etcd)
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
	
}

Stack.prototype.test = function(done){
	done()
}

Stack.prototype.run = function(done){
	this.vikingfile.load(done)
	
}

Stack.prototype.createImage = function(imageName, done){

	utils.log('dev build', imageName)
	var image = self._images[imageName]

	var builder = Builder({
		stack:self.id,
		node:imageName + '-dev',
		folder:self.dir,
		dockerFile:image
	})

	builder.build(nextImage)
}

Stack.prototype.createJobs = function(procName, opts, done){
	var self = this;
	var container = self._containers[procName]
	var scale = container.scale || 1
	var jobs = []
	var opts = opts || {}

	var name = procName

	if(opts.dev){
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


Stack.prototype.dev = function(done){
	var self = this;

	utils.log('dev mode', 'booting')
	async.series([

		// load up
		function(next){
			self.load(next)
		},

		function(next){
			endpoints.registry(self.etcd, function(err, location){
				console.log('-------------------------------------------');
				console.dir(location)
				process.exit()
			})
		},

		function(next){
			self.vikingfile.developmentVolumes(self.dir)
			next()
		},

		// build images
		function(next){

			async.forEachSeries(self._buildOrder, self.createImage.bind(self), next)

		},

		// run containers
		function(next){

			async.forEachSeries(self._bootOrder, self.createJobs.bind(self), next)
			
		}

	], function(err){
		if(err){
			utils.error(err)
			process.exit(1)
		}
		done()
	})
	
}

module.exports = function(vikingconfig, dir, config){
	return new Stack(vikingconfig, dir, config)
}