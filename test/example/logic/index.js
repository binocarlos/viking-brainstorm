var http = require('http');
var express = require('express');

var app = express()
var server = http.createServer(app)

var val = process.argv[3]

app.use(function(req, res){
	res.end(val)
})

server.listen(5401, function(){
	console.log('login listening');
})