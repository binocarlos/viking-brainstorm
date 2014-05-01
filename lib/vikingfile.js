var yaml = require('js-yaml');
var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function VikingFile(path, opts){
	EventEmitter.call(this);
	this.path = path
	this.options = opts || {}
	this.index = this.options.index || '127.0.0.1:5000'
	if(!fs.existsSync(path)){
		throw new Error('path does not exist: ' + path)
	}
}

util.inherits(VikingFile, EventEmitter);

VikingFile.prototype.load = function(done){

	var self = this;
	var doc = yaml.safeLoad(fs.readFileSync(this.path, 'utf8'))

	this.config = doc.viking || {}

	if(!this.config.name){
		console.error('VikingFile -> viking.name property required')
		process.exit(1);
	}

	if(!this.config.name.match(/^\w+$/)){
		console.error('VikingFile -> viking.name must be alphanumeric all lower case')
		process.exit(1);	
	}

	var stackname = this.config.name

	var deps = {}
	var dockerfiles = {}
	var build = []

	Object.keys(doc.containers || {}).forEach(function(nodename){
		var dockerfile = doc.containers[nodename]
		dockerfile = dockerfile.replace(/FROM viking:(\w+)\/(\w+)/, function(m, stack, name){
			return 'FROM ' + self.index + '/' + stack + '/' + name
		})
		dockerfiles[stackname + '/' + nodename] = dockerfile
	})

	console.log(JSON.stringify(dockerfiles, null, 4));
	process.exit();

}

module.exports = function(path, opts){
	return new VikingFile(path, opts)
}