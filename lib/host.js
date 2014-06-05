// this runs on all vikings with an etcd client to listen for events
var etcdjs = require('etcdjs')
var config = require('./config')()
var spawn = require('child_process').spawn
var Slave = require('./slave')
var Leader = require('./leader')
var logger = require('../tools/logger')

function runSlave(etcd){
	var slave = Slave(config, etcd)
	slave.start(function(err){
		if(err){
			logger.error('ERROR STARTING SLAVE ' + err)
			return
		}
		logger('[slave] running')
	})
}

function runMaster(etcd){
	var leader = Leader(config, etcd)
	leader.listen(function(err){
		if(err){
			logger.error('ERROR STARTING MASTER ' + err)
			return
		}
		logger('[master] running')
	})
}

function runHost(etcd){

	if(config.master){
		runMaster(etcd)
	}

	if(config.slave){
		runSlave(etcd)
	}
}

module.exports = function(opts){

	var etcdhosts = config.network.etcd || '127.0.0.1:4001'
	var etcd = etcdjs(etcdhosts)
	
	runHost(etcd)
}
