var EventEmitter = require('events').EventEmitter
var util = require('util')

function SlaveEvents(etcd){
  EventEmitter.call(this)
  this._etcd = etcd
}

util.inherits(SlaveEvents, EventEmitter)

module.exports = SlaveEvents

SlaveEvents.prototype.listen = function(){
  
}    

module.exports = function(etcd){
  return new SlaveEvents(etcd)
}