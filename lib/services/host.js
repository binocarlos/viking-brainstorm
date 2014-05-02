var etcdjs = require('etcdjs')
var Process = require('../process')
var utils = require('component-consoler')
var config = require('../config')()

module.exports = function(options){

	options = options || {}

	if(!options.cluster.etcd){
		throw new Error('cluster.etcd setting required for host')
	}

  options.name = 'viking-host'
  options.cmd = "node bin/viking-host --etcd=" + config.cluster.etcd
  options.cwd = __dirname + '/../..'

  return Process(options)
}
