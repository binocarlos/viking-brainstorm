var EventEmitter = require('events').EventEmitter
var util = require('util')

function Job(data){
  EventEmitter.call(this)
  this._data = data
}

util.inherits(Job, EventEmitter)

module.exports = Job

Job.prototype.isFixed = function(){
  if(this._data.volumes && this._data.volumes.length){
    return true
  }

  return this._data.fixed
}

module.exports = function(data){
  return new Job(data)
}