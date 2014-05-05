var path = require('path');
var Container = require('../container');
var Volume = require('../volume');

module.exports = function(config){

  console.log('-------------------------------------------');
  console.dir(config)
  console.log('change registry to /var')
  process.exit()

	var options = {
    stack:'core',
    name:'registry',
    image:'registry',
    system:true,
    filter:{
      leader:true
    },
    ports:[
      '5000:5000'
    ],
    env:{
      DOCKER_REGISTRY_CONFIG:'/registryconf/config.yml',
      SETTINGS_FLAVOR:'development'
    },
    volumes:[
      path.normalize(__dirname + '/../../files/registry') + ':/registryconf',
      '/tmp/registry:/tmp/registry'
    ]
  }

  return options
}