var yaml = require('js-yaml');
var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var parser = require('dockerfile-parse')
var utils = require('component-consoler');

function VikingFile(path, opts){
	EventEmitter.call(this);
	this.path = path
	this.options = opts || {}
	this.index = this.options.index || '127.0.0.1:5000'
	if(!fs.existsSync(path)){
		util.error('path does not exist: ' + path)
		process.exit(1);
	}
}

util.inherits(VikingFile, EventEmitter);

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

	utils.log('vikingfile', '' + stackname + ' - ' + (stackcomment || ''))

	var images = doc.image || {}
	var containers = doc.container || {}
	var websites = doc.website || {}

	var buildOrder = []
	var bootOrder = []
	var imageDeps = {}
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
		container.id = key
		bootOrder.push({
			container:key,
			image:container.image
		})
	})

	bootOrder = bootOrder.sort(function(a, b){
		var ia = containers[a.image]
		var ib = containers[b.image]

		if(ia.static && ib.fixed){
			return -1
		}

		if(ib.static && ia.fixed){
			return 1
		}

		if (ia.static || ia.fixed)
	     return -1
	  if (ib.static || ib.fixed)
	     return 1;
	  
	  return 0;
	})

	bootOrder = bootOrder.map(function(o){
		return o.container
	})

	console.log('-------------------------------------------');
	console.log('build');
	console.dir(buildOrder);
	console.log('-------------------------------------------');
	console.log('boot');
	console.dir(bootOrder);
	process.exit();

	Object.keys(websites || {}).forEach(function(key){
		var website = websites[key]
	})
}

module.exports = function(path, opts){
	return new VikingFile(path, opts)
}