var Service = require('./service');
var Volume = require('./volume');

module.exports = function(config){

	var name = config.network.hostname;
	var ip = config.network.private;
  var token = config.network.token;

	var options = {
    name:'etcd',
    image:'coreos/etcd',
    command:'-name ' + name + ' -addr 0.0.0.0:4001 -peer-addr ' + ip + ':7001 -discovery ' + token + ' -data-dir /data/db -snapshotCount 100 -snapshot',
    ports:[
      '4001:4001',
      '7001:7001'
    ],
    volumes:[
      Volume(config, 'core', '/data/db')
    ]
  }
	
  console.log('-------------------------------------------');
  console.dir(options);
  process.exit();
	return Service('core', 'etcd', options);
}