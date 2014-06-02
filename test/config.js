var config = require('../lib/config')()
var tape     = require('tape')

tape('config properties', function(t){
  
  t.ok(config.system, 'has system config')
  t.ok(config.system.containers.length, 'system container names')
  t.ok(config.network, 'has network config')
  t.equal(config.network.hostname, 'viking-0', 'has the hostname')
  t.ok(config.network.etcd, 'has etcd config')
  t.end()

})

