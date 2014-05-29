// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var PingStat = require('pingstat')

function Monitor(etcd, config){
	var self = this;
	EventEmitter.call(this)
	this._etcd = etcd
	this._config = config
	this._hostname = config.network.hostname
	this._key = '/host/' + this._hostname
	this._entry = {
		name:this._hostname,
		config:config
	}
	this._stats = PingStat({
		delay:1000,
		interval:5000
	})
	this._stats.on('stat', function(stats){
		self._entry.stats = stats
	})
}

util.inherits(Monitor, EventEmitter)

module.exports = Monitor

Monitor.prototype.update = function(value){
	var self = this;
	if(value != self._value){
		self.emit('change', value)
		if(value==this._hostname){
			self.emit('elect')
		}
	}
}

Monitor.prototype.loop = function(){
	this._timeout = setTimeout(this.update.bind(this), 5000)
}

Monitor.prototype.setLeader = function(){
	var self = this;
	self._entry.leader = true
}

Monitor.prototype.update = function(){
	var self = this
	this.emit('update', this._entry)
	this._etcd.set('/host/' + this._hostname, JSON.stringify(this._entry), {
		ttl:10
	}, function(err){
		self.loop()
	})
}

Monitor.prototype.start = function(){
	this.update()
}

Monitor.prototype.stop = function(){
	if(this._timeout){
		clearTimeout(this._timeout)
	}
}

module.exports = function(etcd, config){

	return new Monitor(etcd, config)
		
}
