var Container = require('../container');
var Volume = require('../volume');

module.exports = function(config){

	var name = config.network.hostname;
	var ip = config.network.private;
  var token = config.network.token;

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
    '/data/db',
    '-snapshot-count',
    '100',
    '-discovery',
    token
  ]

  return etcd
}