var tape     = require('tape')
var config = require('../lib/config')()
var Volume = require('../lib/tools/volume')
var wrench = require('wrench')
var fs = require('fs')

tape('test the creation of a volume', function(t){

	var vol = Volume(config, 'test', '/test1/store')
	var volumes = config.system.volumes

	var parts = vol.split(':')
	var localPath = parts[0]
	t.ok(fs.existsSync(localPath), 'the folder has been created')

	t.equal(localPath, volumes + '/test/test1/store')
	t.equal(vol, volumes + '/test/test1/store:/test1/store')

	wrench.rmdirSyncRecursive(localPath)
	t.end()
  

})
