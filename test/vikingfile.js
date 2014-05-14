var VikingFile = require('../lib/vikingfile')
var tape     = require('tape')

tape('vikingfile', function(t){

  var file = VikingFile(__dirname + '/example/viking.yml', {
  	index:'127.0.0.1:5000'
  })

  file.load(function(err, data){
  	t.ok(!err, 'no error returned')

  	t.equal(data.config.name, 'ragnar')
  	t.equal(data.config.comment, 'Ragnar Hamster Lothbrok')

  	t.deepEqual(data.buildOrder, ['src', 'inherit'])
  	t.deepEqual(data.bootOrder, ['db', 'mongo', 'redis', 'logic', 'website', 'help'])

  	t.deepEqual(data.images.src, {
  		add:[{
  			source:'.',
  			dest:'/srv/app'
  		}],
  		expose:[],
  		volume:[],
  		run:[
  			'cd /srv/app && npm install'
  		],
  		from:'quarry/monnode'
  	})

    t.deepEqual(data.containers.db, {
      image:'viking:ragnar/src',
      expose:[80],
      volume:['/data/db'],
      run:'mon node index.js --volume=/data/db',
      cwd:'/srv/app/db'
    })

  	t.end()
  })

})