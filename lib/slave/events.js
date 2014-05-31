var EventEmitter = require('events').EventEmitter
var util = require('util')

function SlaveEvents(etcd, hostname){
  EventEmitter.call(this)
  this._etcd = etcd
  this._hostname = hostname
}

util.inherits(SlaveEvents, EventEmitter)

module.exports = SlaveEvents

SlaveEvents.prototype.listen = function(){
	this.listenDeploy()
}

SlaveEvents.prototype.listenDeploy = function(){
	var self = this;
	this._etcd.wait('/deploy/' + this._hostname, {
		recursive:true
	}, function onProc(err, data, next){
		if(err || !data){
			return next(onProc)
		}
		self.emit('deploy', data)
		return next(onProc)
	})
}

module.exports = function(etcd, hostname){
  return new SlaveEvents(etcd, hostname)
}