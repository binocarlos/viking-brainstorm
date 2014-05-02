var http = require('http');
var express = require('express');

var app = express()
var server = http.createServer(app)

app.use(function(req, res){
	res.end('10')
})

server.listen(5401, function(){
	console.log('login listening');
})