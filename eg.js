var http = require('http');

var server = http.createServer(function(req, res){
	res.end('ok')
})

server.listen(9999, function(){
	console.log('listening');
})