var yaml = require('js-yaml');
var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var parser = require('dockerfile-parse')
var logger = require('./logger')

function VikingFile(path, opts){
	EventEmitter.call(this);
	this.path = path
	this.options = opts || {}
	this.index = this.options.index || '127.0.0.1:5000'
	if(!fs.existsSync(path)){
		logger.error('path does not exist: ' + path)
		process.exit(1);
	}
}

util.inherits(VikingFile, EventEmitter);

// convert the ADD commands into volumes and pass the volumes to inherited images
// this is so they can change code whilst the containers are running (dev mode yo)
// also - we remove any RUN command that contains npm install in the line
VikingFile.prototype.developmentVolumes = function(folder){
	var self = this;
	var imgs = this.data.images
	var containers = this.data.containers
	var deps = this.data.imageDeps
	var run = this.data.run

	Object.keys(imgs || {}).forEach(function(key){
		var image = imgs[key]
		if(!image){
			logger.error('no image found for: ' + key)
			return
		}
		image._devvolumes = []

		var add = image.add || []
		add.forEach(function(add){
			var source = add.source.replace(/^\./, folder)
			image._devvolumes.push(source + ':' + add.dest)
		})

		image.run = (image.run || []).filter(function(cmd){
			return !cmd.match(/npm install/i)
		})
	})

	Object.keys(deps || {}).forEach(function(key){
		var parent = deps[key]

		var image = imgs[key]
		var parentimage = imgs[parent]

		image._devvolumes = [].concat(parentimage._devvolumes)
	})

	// now apply the image devvolumes to the containers that use the image

	Object.keys(containers || {}).forEach(function(key){
		var container = containers[key]
		var image = container.image
		if(image && image.indexOf('viking:' + self.viking.name)==0){
			var imagename = image.split('/').pop()
			var i = imgs[imagename]
			if(i._devvolumes){
				if(!container.volume){
					container.volume = []
				}
				container.volume = container.volume.concat(i._devvolumes)
			}
		}
	})
}

VikingFile.prototype.load = function(done){

	var self = this;
	var doc = yaml.safeLoad(fs.readFileSync(this.path, 'utf8'))

	this.viking = doc.viking || {}

	if(!this.viking.name){
		util.error('VikingFile -> viking.name property required')
		process.exit(1);
	}

	if(!this.viking.name.match(/^\w+$/)){
		util.error('VikingFile -> viking.name must be alphanumeric all lower case')
		process.exit(1);	
	}

	var stackname = this.viking.name
	var stackcomment = this.viking.comment || ''

	logger('[vikingfile] ' + stackname + ' - ' + (stackcomment || ''))

	var images = doc.build || {}
	var containers = doc.deploy || {}

	var buildOrder = []
	var bootOrder = []
	var imageDeps = {}
	var linkDeps = {}
	var imagePojos = {}

	Object.keys(images || {}).forEach(function(key){
		var image = images[key]
		var parsed = parser(image)

		image.id = key
		
		var localMatch = parsed.from.match(/^viking:(\w+)\/(\w+)$/)
		if(localMatch){
			if(localMatch[1]==stackname){
				imageDeps[key] = localMatch[2]
			}
		}

		imagePojos[key] = parsed
		buildOrder.push(key)
	})

	buildOrder = buildOrder.sort(function(a, b){

		if(imageDeps[a]){
			return 1
		}
		if(imageDeps[b]){
			return -1
		}
		else{
			return 0
		}
	})

	Object.keys(containers || {}).forEach(function(key){
		var container = containers[key]

		if(container.link){
			container.link.forEach(function(link){
				linkDeps[link] = true
			})
		}
		
	})

	bootOrder = Object.keys(containers || {})

	bootOrder = bootOrder.sort(function(a, b){

		var ia = containers[a] || {}
		var ib = containers[b] || {}

		if(linkDeps[a]){
			return 1
		}
		else if(linkDeps[b]){
			return -1
		}

		if (ia.volume && ia.volume.length)
	     return -1
	  if (ib.volume && ib.volume.length)
	     return 1;
	  
	  return 0;
	})

	var data = {
		buildOrder:buildOrder,
		bootOrder:bootOrder,
		images:imagePojos,
		imageDeps:imageDeps,
		containers:containers,
		config:self.viking
	}

	self.data = data
	done(null, data)
}

module.exports = function(path, opts){
	return new VikingFile(path, opts)
}