var EventEmitter = require('events').EventEmitter
var util = require('util')

function Server(data){
  EventEmitter.call(this)
  this._data = data
}

util.inherits(Server, EventEmitter)

module.exports = Server

module.exports = function(data){
  return new Server(data)
}