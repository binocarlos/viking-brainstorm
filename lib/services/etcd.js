var Volume = require('../volume');

function vol(config){
  return Volume(config, 'core', '/data/etcd', 'local')
}

module.exports = function(config){

	var name = config.network.hostname;
	var ip = config.network.private;
  var token = config.network.token;
  var volume = vol(config)

  var etcd = [
    '-name',
    name,
    '-bind-addr',
    '0.0.0.0:4001',
    '-addr',
    ip + ':4001',
    '-peer-election-timeout',
    500,
    '-peer-bind-addr',
    '0.0.0.0:7001',
    '-peer-addr',
    ip + ':7001',
    '-data-dir',
    volume,
    '-snapshot-count',
    '100',
    '-discovery',
    token
  ]

  return etcd
}

module.exports.volume = vol