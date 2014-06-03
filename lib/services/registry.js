var path = require('path');
var Denver = require('denver')
var Volume = require('../tools/volume');

module.exports = function(config, etcd, done){

  var denver = Denver({}, etcd)

  denver.env('core', function(err, env){

    env = env || {}

    // the volume so we are sharing the config
    var volumes = []

    // the env has been augmented from denver -> vikingcore
    var env = {
      SETTINGS_FLAVOR:config.env || 'development',
      SECRET_KEY:'core.REGISTRY_SECRET_KEY',
      STORAGE_PATH:
      AWS_KEY:'core.AWS_KEY',
      AWS_SECRET:'core.AWS_SECRET',
      AWS_BUCKET:'core.REGISTRY_AWS_BUCKET'
    }


    // the development volume for images
    if(config.env=='development'){
      volumes.push(Volume(config, 'core', '/data/registry'))
      env.STORAGE_PATH = '/data/registry'
    }
    

    var options = {
      stack:'core',
      name:'registry',
      image:'registry',
      filter:[{
        tag:'system',
        flexible:true
      }],
      ports:[
        '5000:5000'
      ],
      env:env,
      volumes:volumes
    }

    done(null, options)
  })

}