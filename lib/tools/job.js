var EventEmitter = require('events').EventEmitter
var util = require('util')
var tools = require('./index')
var littleid = require('littleid')

function Job(data){
  EventEmitter.call(this)
  this._data = data
}

util.inherits(Job, EventEmitter)

module.exports = Job

Job.prototype.key = function(){
	return tools.jobKey(null, this._data)
}

Job.prototype.baseKey = function(){
	return tools.jobKey(null, this._data).replace('/' + this._data.pid, '')
}

Job.prototype.data = function(){
	return this._data
}

Job.prototype.tags = function(){
	var tags = {}
	var self = this;
	Object.keys(this._data.filter || {}).forEach(function(key){
		tags[key] = self._data.filter[key]
	})
	return tags
}

Job.prototype.hasVolumes = function(){
	return this._data.volumes && this._data.volumes.length
}

Job.prototype.isFixed = function(){
	return this.hasVolumes() || this._data.fixed
}

Job.prototype.baseId = function(){
	var parts = (this._data.id || '').split('-')
	parts.pop()
	return parts.join('-')
}

Job.prototype.ensureValues = function(){
	if(!this._data.tag){
		this._data.tag = 'default'
	}
	if(!this._data.pid){
		this._data.pid = littleid()
	}
	if(!this._data.id){
		this._data.id = [this._data.stack, this._data.tag, this._data.name, this._data.pid].join('-')
	}
}
			
module.exports = function(data){
  return new Job(data)
}

module.exports.fromKey = function(string){
	var parts = string.split('-')
	return new Job({
		stack:parts[0],
		tag:parts[1],
		name:parts[2],
		pid:parts[3]
	})
}