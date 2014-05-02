var http = require('http');
var express = require('express');

var app = express()
var ecstatic = require('ecstatic')
var server = http.createServer(app)

app.use(ecstatic(__dirname + '/www'))

server.listen(80, function(){
	console.log('server listening');
})