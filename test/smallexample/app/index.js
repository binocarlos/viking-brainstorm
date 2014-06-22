var http = require('http');

var server = http.createServer(function(req, res){
	res.send('hello')
})

server.listen(80, function(){
	console.log('app listening');
})