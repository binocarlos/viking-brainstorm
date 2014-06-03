var EventEmitter = require('events').EventEmitter
var util = require('util')
var tools = require('./index')

function Job(data){
  EventEmitter.call(this)
  this._data = data
}

util.inherits(Job, EventEmitter)

module.exports = Job

Job.prototype.key = function(){
	return tools.jobKey(null, this._data)
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


Job.prototype.ensureValues = function(){
	if(!this._data.tag){
		this._data.tag = 'default'
	}
	if(!this._data.id){
		this._data.id = this._data.stack + '/' + this._data.tag + '/' + this._data.name
	}
}
			
module.exports = function(data){
  return new Job(data)
}