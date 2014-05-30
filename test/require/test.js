var path = require('path');

module.exports = function(viking, done){

  var denver = Denver({}, etcd)

  denver.env('core', function(err, env){

    // mount a local volume
    var volumes = [
      path.normalize(__dirname) + ':/testyaml'
    ]

    // mount a persistent volume
    if(config.env=='development'){
      volumes.push('/data/registry')
    }
    
    // the env has been augmented from denver -> vikingcore
    var env = 

    var container = {
      //stack:'core',
      //name:'registry',
      image:'registry',
      system:true,
      filter:{
        core:true
      },
      ports:[
        '5000:5000'
      ],
      env:{
        DOCKER_REGISTRY_CONFIG:'/registryconf/config.yml',
        SETTINGS_FLAVOR:config.env,
        SECRET_KEY:env.REGISTRY_SECRET_KEY,
        AWS_KEY:env.AWS_KEY,
        AWS_SECRET:env.AWS_SECRET,
        AWS_BUCKET:env.REGISTRY_AWS_BUCKET
      },
      volumes:volumes
    }

    done(null, options)
  })

}