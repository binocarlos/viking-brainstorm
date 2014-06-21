var Router = require("routes-router")
var EventEmitter = require('events').EventEmitter
var util = require('util')
var concat = require('concat-stream');
var url = require('url');

function App(config, etcd){
	EventEmitter.call(this)
	this._config = config
	this._etcd = etcd
	this.router = this.createRoutes()
}

util.inherits(App, EventEmitter)

App.prototype.createRoutes = function(){
	var router = Router()
  router.addRoute("/", this.status.bind(this))
  router.addRoute("/feedback", this.feedback.bind(this))
	return router
}

App.prototype.handler = function(){
	var self = this;
	return function(req, res){

		var pathname = url.parse(req.url).pathname

		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('API')
		console.dir(pathname)
		self.router(req, res)
	}
}

App.prototype.status = function(req, res){
	res.end('hello')
}

App.prototype.feedback = function(req, res){
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.dir('FEEDBACK HIT')
	console.dir(req.url)
	req.pipe(concat(function(body){
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log(body)
	}))
}

module.exports = function(config, etcd){
	return new App(config, etcd)
}