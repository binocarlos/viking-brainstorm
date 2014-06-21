var Router = require("routes-router")
var EventEmitter = require('events').EventEmitter
var util = require('util')
var concat = require('concat-stream');
var url = require('url');
var littleid = require('littleid')
var Feedback = require('./feedback')

function App(config, etcd){
	EventEmitter.call(this)
	this._config = config
	this._etcd = etcd
	this.feedback = Feedback(config, etcd)
	this.router = this.createRoutes()
}

util.inherits(App, EventEmitter)

App.prototype.createRoutes = function(){
	var router = Router()
  router.addRoute("/", this.status.bind(this))
  router.addRoute("/v1/feedback*?", this.feedback.handler.bind(this.feedback))
	return router
}

App.prototype.handler = function(){
	var self = this;
	return function(req, res){
		self.router(req, res)
	}
}

App.prototype.status = function(req, res){
	res.end('hello')
}

module.exports = function(config, etcd){
	return new App(config, etcd)
}