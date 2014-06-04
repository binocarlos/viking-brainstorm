var path = require('path');
var Denver = require('denver')
var Volume = require('../tools/volume');

module.exports = function(config){
  var flavour = 'dev'
  if((config.env||'').indexOf('prod')==0){
    flavour = 'prod'
  }
  var options = {
    stack:'core',
    name:'registry',
    image:'registry',
    deamon:true,
    filter:[{
      tag:'system',
      flexible:true
    }],
    ports:[
      '5000:5000'
    ],
    env:{
      SETTINGS_FLAVOR:flavour,
      DOCKER_REGISTRY_CONFIG:'/home/regconfig/registry.conf',
      AWS_KEY:'core.AWS_KEY',
      AWS_SECRET:'core.AWS_SECRET',
      AWS_BUCKET:'core.REGISTRY_AWS_BUCKET'
    },
    volumes:[
      '/home/docker/registry',
      path.normalize(__dirname + '/../../files/registry') + ':/home/regconfig'
    ]
  }
  return options
}