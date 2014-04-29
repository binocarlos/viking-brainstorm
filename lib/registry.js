var path = require('path');
var Container = require('./container');
var Volume = require('./volume');

module.exports = function(config){

	var options = {
    stack:'core',
    name:'registry',
    image:'registry',
    ports:[
      '5000:5000'
    ],
    env:{
      DOCKER_REGISTRY_CONFIG:'/registryconf/config.yml'
    },
    volumes:[
      path.normalize(__dirname + '/../files/registry') + ':/registryconf'
    ]
  }
	
	return Container(options);
}