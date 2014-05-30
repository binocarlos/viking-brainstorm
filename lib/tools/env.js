var fs = require('fs')
var path = require('path')
var denver = require('denver')
var config = require('../config')()

var Env = module.exports = {
	load:function loadEnv(stacks, done){
		var parts = (config.network.etcd.split(',')[0] || '').split(':')
		var den = denver({
			host:parts[0],
			port:parts[1],
			key:'/denver'
		});
	  den.env(stacks, done)
	}
}