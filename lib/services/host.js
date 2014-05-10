var etcdjs = require('etcdjs')
var Process = require('../process')
var utils = require('component-consoler')
var config = require('../config')()

module.exports = function(options, done){

	options = options || {}

	if(!options.network.etcd){
		throw new Error('cluster.etcd setting required for host')
	}

  options.name = 'viking-host'
  options.cmd = "node bin/viking-host --etcd=" + config.network.etcd
  options.cwd = __dirname + '/../..'

  done(null, Process(options))
}
