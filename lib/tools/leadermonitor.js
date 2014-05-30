var utils = require('component-consoler');
var EventEmitter = require('events').EventEmitter
var util = require('util')

function Monitor(etcd, config){
	EventEmitter.call(this)
	this._etcd = etcd
	this._config = config
	this._hostname = config.network.hostname
	this._value = null
}

util.inherits(Monitor, EventEmitter)

module.exports = Monitor

Monitor.prototype.update = function(value){
	var self = this;
	if(value != self._value){
		self.emit('change', value)
		if(self._value==self._hostname && self._value!=value){
			self.emit('deselect')
		}
		if(value==self._hostname){
			self.emit('select')
		}
	}
	self._value = value
}

Monitor.prototype.loop = function(){
	this._timeout = setTimeout(this.check.bind(this), 5000)
}

Monitor.prototype.check = function(){
	var self = this;
	this._etcd.stats.leader(function(err, stats){
		if(!err && stats){
			self.update(stats.leader)
		}
		self.loop()
	})
}

Monitor.prototype.start = function(){
	this.check()
}

Monitor.prototype.stop = function(){
	if(this._timeout){
		clearTimeout(this._timeout)
	}
}

module.exports = function(etcd, config){

	return new Monitor(etcd, config)
		
}
