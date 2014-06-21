var EventEmitter = require('events').EventEmitter
var util = require('util')
var concat = require('concat-stream');
var url = require('url');
var through2 = require('through2')
var littleid = require('littleid')

function Feedback(config, etcd){
	EventEmitter.call(this)
	this._feedbacks = {}
}

util.inherits(Feedback, EventEmitter)

Feedback.prototype.add = function(key, res, id){
	var keyMap = this._feedbacks[key] || {}
	keyMap[id] = res
	this._feedbacks[key] = keyMap

	res.on('close', function(){
		delete(keyMap[id])
	})
}

Feedback.prototype.write = function(key, data){
	var self = this;
	Object.keys(this._feedbacks[key] || {}).forEach(function(reskey){
		self._feedbacks[key][reskey].write(data)
	})
}

Feedback.prototype.close = function(key){
	var self = this;
	Object.keys(this._feedbacks[key] || {}).forEach(function(reskey){
		self._feedbacks[key][reskey].end()
	})

	delete(self._feedbacks[key])
}

Feedback.prototype.handler = function(req, res){
	var self = this;
	var method = req.method.toLowerCase()
	var feedbackKey = url.parse(req.url).pathname.replace(/^\/feedback/, '')
	var connectionId = littleid()

	if(method=='get'){
		res.writeHead(200, { "Content-Type": "text/plain" });
		this.add(feedbackKey, res, connectionId)
	}
	else if(method=='post'){
		req.pipe(through2(function(chunk, enc, next){
			self.write(feedbackKey, chunk)
			next()
		}, function(){
			self.close(feedbackKey)
			res.end('ok')
		}))
	}
	else{
		res.statusCode = 404
		res.end('method must be get or post')
	}
}

module.exports = function(config, etcd){
	return new Feedback(config, etcd)
}