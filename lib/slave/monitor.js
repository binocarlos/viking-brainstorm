// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter
var util = require('util')
//var PingStat = require('pingstat')

function Monitor(config, etcd){
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
	/*
	this._stats = PingStat({
		delay:1000,
		interval:5000
	})
	this._stats.on('stat', function(stats){
		self._entry.stats = stats
	})*/
}

util.inherits(Monitor, EventEmitter)

module.exports = Monitor

Monitor.prototype.loop = function(){
	this._timeout = setTimeout(this.update.bind(this), 5000)
}

Monitor.prototype.setLeader = function(){
	var self = this;
	self._entry.leader = true
	this.writeConfig(function(){
		
	})
}

Monitor.prototype.update = function(){
	var self = this
	this.emit('update', this._entry)
	this._etcd.set('/host/' + this._hostname, null, {
		ttl:10,
		dir:true,
		prevExist:true
	}, function(err){
		self.loop()
	})
}

Monitor.prototype.writeConfig = function(done){
	var self = this;
	self._etcd.set('/host/' + self._hostname + '/config', JSON.stringify(this._entry), done)
}

Monitor.prototype.create = function(done){
	var self = this;
	this._etcd.set('/host/' + self._hostname, null, {
		dir:true,
		ttl:10
	}, function(){
		async.series([
		  function(next){
		  	self.writeConfig(next)
		  }
		], done)
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

module.exports = function(config, etcd){

	return new Monitor(config, etcd)
		
}
