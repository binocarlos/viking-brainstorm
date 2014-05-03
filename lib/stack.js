var yaml = require('js-yaml')
var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var VikingFile = require('./vikingfile')
var Builder = require('./builder')
var async = require('async');
var utils = require('component-consoler');

function Stack(dir, opts){
	EventEmitter.call(this);
	this.dir = dir
	this.options = opts || {}
	this.configpath = path.normalize(this.dir + '/' + (this.options.config || 'viking.yml'))
	this.vikingfile = VikingFile(this.configpath, this.options)
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

Stack.prototype.dev = function(done){
	var self = this;

	utils.log('dev mode', 'booting')
	async.series([

		// load up
		function(next){
			self.load(next)
		},

		function(next){
			self.vikingfile.development(self.dir)
			next()
		},

		// build images
		function(next){
			async.forEachSeries(self._buildOrder, function(imageName, nextImage){

				utils.log('dev build', imageName)
				var image = self._images[imageName]

				var builder = Builder({
					stack:self.id,
					node:imageName,
					folder:self.dir,
					dockerFile:image
				})

				builder.build(nextImage)

			}, next)
		},

		// run containers
		function(next){

		}

	], function(err){
		if(err){
			utils.error(err)
			process.exit(1)
		}
		done()
	})
	
}

module.exports = function(dir, config){
	return new Stack(dir, config)
}