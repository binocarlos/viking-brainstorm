var path = require('path');
var Container = require('../container');
var Volume = require('../volume');

module.exports = function(config, done){

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
      SETTINGS_FLAVOR:config.env,
      SECRET_KEY:'7jC9THnLDjPOldE7qPPajmR1qNPwmtUarOxRMmhHzGmSLgIvy20xTjcpyduw7gbP'
    },
    volumes:[
      path.normalize(__dirname + '/../../files/registry') + ':/registryconf',
      Volume(config, 'core', '/data/registry')
    ]
  }

  done(null, options)
}