var EventEmitter = require('events').EventEmitter
var util = require('util')

function Server(data){
  EventEmitter.call(this)
  this._data = data
}

util.inherits(Server, EventEmitter)

module.exports = Server

Server.prototype.hostname = function(){
	return this._data.config.network.hostname
}

module.exports = function(data){
  return new Server(data)
}