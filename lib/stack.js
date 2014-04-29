var yaml = require('js-yaml');
var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Stack(dir, config){
	EventEmitter.call(this);
	this.dir = dir
	this.config = path.normalize(this.dir + '/' + config)

	if(!fs.existsSync(this.config)){
		throw new Error(this.config + ' does not exist')
	}
}

util.inherits(Stack, EventEmitter);

Stack.prototype.load = function(done){
	var doc = yaml.safeLoad(fs.readFileSync(this.config, 'utf8'))

	console.log('-------------------------------------------');
	console.dir(doc);
}

module.exports = function(dir, config){
	return new Stack(dir, config)
}