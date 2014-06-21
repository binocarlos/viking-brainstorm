var http = require('http')
var logger = require('../tools/logger')
var App = require(app)

module.exports = function(config, etcd){
	var server = http.createServer(App(config, etcd))
	server.listen(8791, function(){
		logger('[api server running]')
	})
}