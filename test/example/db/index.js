var http = require('http');
var express = require('express');

var app = express()
var server = http.createServer(app)

app.use(function(req, res){
	res.end('12')
})

server.listen(80, function(){
	console.log('db listening');
})