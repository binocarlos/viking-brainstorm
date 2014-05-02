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
		util.error('path does not exist: ' + path)
		process.exit(1);
	}
}

util.inherits(VikingFile, EventEmitter);

VikingFile.prototype.load = function(done){

	var self = this;
	var doc = yaml.safeLoad(fs.readFileSync(this.path, 'utf8'))

	this.config = doc.viking || {}

	if(!this.config.name){
		util.error('VikingFile -> viking.name property required')
		process.exit(1);
	}

	if(!this.config.name.match(/^\w+$/)){
		util.error('VikingFile -> viking.name must be alphanumeric all lower case')
		process.exit(1);	
	}

	var stackname = this.config.name
	var stackcomment = this.config.comment || ''

	util.log('vikingfile', 'building: ' + stackname + ' - ' + (stackcomment || ''))

	

}

module.exports = function(path, opts){
	return new VikingFile(path, opts)
}