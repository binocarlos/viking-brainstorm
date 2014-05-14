var VikingFile = require('../lib/vikingfile')
var tape     = require('tape')

tape('vikingfile', function(t){

  var file = VikingFile(__dirname + '/example/viking.yml', {
  	index:'127.0.0.1:5000'
  })

  file.load(function(err, data){
  	t.ok(!err, 'no error returned')

  	console.log('-------------------------------------------');
  	console.dir(data)
  	t.end()
  })

})