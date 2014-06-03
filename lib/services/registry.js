var path = require('path');
var Denver = require('denver')
var Volume = require('../tools/volume');

module.exports = function(config){
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
      SETTINGS_FLAVOR:config.env || 'development',
      SECRET_KEY:'core.REGISTRY_SECRET_KEY',
      STORAGE_PATH:'/data/registry',
      AWS_KEY:'core.AWS_KEY',
      AWS_SECRET:'core.AWS_SECRET',
      AWS_BUCKET:'core.REGISTRY_AWS_BUCKET'
    },
    volumes:[
      '/data/registry'
    ]
  }
  return options
}