var EventEmitter = require('events').EventEmitter
var util = require('util')
var tools = require('./tools')

function Job(data){
  EventEmitter.call(this)
  this._data = data
}

util.inherits(Job, EventEmitter)

module.exports = Job

Job.prototype.key = function(){
	return tools.jobKey(null, this._data)
}

Job.prototype.portKey = function(){
	return tools.portKey(this._data)
}

Job.prototype.tags = function(){
	var tags = {}
	var self = this;
	Object.keys(this._data.filter || {}).forEach(function(key){
		tags[key] = self._data.filter[key]
	})

	if(this.hasVolumes() && !tags.fixed){
		tags.fixed = true
	}

	return tags
}

Job.prototype.hasVolumes = function(){
	return this._data.volumes && this._data.volumes.length
}

Job.prototype.isFixed = function(){

	return this.hasVolumes() || this._data.fixed
  
}

module.exports = function(data){
  return new Job(data)
}