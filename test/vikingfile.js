var VikingFile = require('../lib/tools/vikingfile')
var tape     = require('tape')

tape('vikingfile', function(t){

  var file = VikingFile(__dirname + '/example/viking.yml', {
  	index:'127.0.0.1:5000'
  })

  file.load(function(err, data){
  	t.ok(!err, 'no error returned')

  	t.equal(data.config.name, 'ragnar')
  	t.equal(data.config.comment, 'Ragnarr Hamster Loðbrók')

  	t.deepEqual(data.buildOrder, ['src', 'inherit'])

  	t.deepEqual(data.bootOrder, [['mongo', 'redis'], ['db', 'logic', 'website', 'help']])

  	t.deepEqual(data.images.src, {
  		add:[{
  			source:'.',
  			dest:'/srv/app'
  		}],
  		expose:[],
  		volume:[],
  		run:[
  			'cd /srv/app && npm --registry http://registry.npmjs.eu/ install'
  		],
  		from:'quarry/monnode'
  	}, 'images src')

    t.deepEqual(data.containers.db, {
      image:'viking:ragnar/src',
      expose:[80],
      link:['mongo'],
      volume:['/data/custom:/data/db'],
      run:'mon node db/index.js --volume /data/db',
      cwd:'/srv/app'
    }, 'containers db')

  	t.end()
  })

})


tape('vikingfile development volumes', function(t){

  var file = VikingFile(__dirname + '/example/viking.yml', {
    index:'127.0.0.1:5000'
  })

  file.load(function(err, data){
    t.ok(!err, 'no error returned')

    file.developmentVolumes(__dirname + '/example')

    t.deepEqual(file.data.images.src._devvolumes, [__dirname + '/example:/srv/app'])
    t.deepEqual(file.data.containers.db.volume, ['/data/custom:/data/db', __dirname + '/example:/srv/app'])


    t.end()
  })

})
