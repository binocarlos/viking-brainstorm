var Volume = require('../tools/volume');
var logger = require('../tools/logger');
var fs = require('fs');
function vol(config){
  return Volume(config, 'core', '/data/etcd')
}

module.exports = function(config, args){

  args = args || {}
	var name = config.network.hostname;
	var ip = config.network.private;
  var token = config.network.token;
  var folder = config.folder || args.folder

  if(folder && !fs.existsSync(folder)){
    logger.error('data folder: ' + folder + ' does not exist')
    process.exit(1)
  }

  var volume = folder ? folder + ':/data/etcd' : vol(config)

  var etcd = [
    '-name',
    name,
    '-bind-addr',
    '0.0.0.0:4001',
    '-addr',
    ip + ':4001',
    '-peer-heartbeat-interval',
    '100',
    '-peer-election-timeout',
    '700',
    '-peer-bind-addr',
    '0.0.0.0:7001',
    '-peer-addr',
    ip + ':7001',
    '-data-dir',
    '/data/etcd',
    '-snapshot-count',
    '100',
    '-discovery',
    token
  ]

  var docker = [
    'run',
    '-d',
    '-t',
    '--name',
    'core-etcd',
    '-v',
    volume,
    '-p',
    '4001:4001',
    '-p',
    '7001:7001',
    'quarry/etcd'
  ]

  return docker.concat(etcd)
}

module.exports.volume = vol