var EventEmitter = require('events').EventEmitter
var util = require('util')

function LeaderEvents(etcd){
  EventEmitter.call(this)
  this._etcd = etcd
}

util.inherits(LeaderEvents, EventEmitter)

module.exports = LeaderEvents

LeaderEvents.prototype.listen = function(){
	this.listenProcs()
	this.listenNetwork()
}

LeaderEvents.prototype.listenProcs = function(){
	var self = this;
	this._etcd.wait('/proc', {
		recursive:true
	}, function onProc(err, data, next){
		if(!data){
			return next(onProc)
		}
		self.emit('proc', data)
		return next(onProc)
	})
	
}

LeaderEvents.prototype.listenNetwork = function(){

	this._etcd.wait('/host', {
		recursive:true
	}, function onHost(err, data, next){

		if(!data){
			return next(onHost)
		}

		if(!active){
			return next(onHost)	
		}
		self.emit('host', data)
		return next(onHost)
	})
	
}

module.exports = function(etcd){
  return new LeaderEvents(etcd)
}