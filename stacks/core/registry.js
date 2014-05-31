var path = require('path');

module.exports = function(viking, done){

  // mount the directory with the config for the registry
  // we can do this because the codebase is on all viking hosts
  var volumes = [
    path.normalize(__dirname + '/registry') + ':/registryconf'
  ]

  // the development volume for images
  if(viking.config.env=='development'){
    volumes.push(viking.volume('/data/registry'))
  }
  
  // the env has been augmented from denver -> vikingcore
  var env = {
    DOCKER_REGISTRY_CONFIG:'/registryconf/config.yml',
    SETTINGS_FLAVOR:viking.config.env,
    SECRET_KEY:viking.env.REGISTRY_SECRET_KEY,
    AWS_KEY:viking.env.AWS_KEY,
    AWS_SECRET:viking.env.AWS_SECRET,
    AWS_BUCKET:viking.env.REGISTRY_AWS_BUCKET
  }

  var options = {
    stack:'core',
    name:'registry',
    image:'registry',
    system:true,
    filter:{
      core:true
    },
    ports:[
      '5000:5000'
    ],
    env:env,
    volumes:volumes
  }

  done(null, options)

}