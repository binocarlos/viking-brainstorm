var http = require('http');
var express = require('express');
var args = require('minimist')(process.argv)

var fs = require('fs')
var app = express()
var server = http.createServer(app)

var folder = args.folder
var file = folder + '/count.txt'
if(!fs.existsSync(folder)){
	console.error('data folder: ' + folder + ' does not exist')
	process.exit(1)
}

if(!fs.existsSync(file)){
	fs.writeFileSync(file, '1', 'utf8')
}

var count = fs.readFileSync(file, 'utf8')
count = parseInt(count)
if(isNaN(count)){
	count = 1
}
app.use(function(req, res){
	count++
	fs.writeFileSync(file, count, 'utf8')
	res.end(count)
})

server.listen(80, function(){
	console.log('db listening');
})