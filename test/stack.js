var Stack = require('../lib/stack')
var config = require('../lib/config')()
var tape     = require('tape')
var tools = require('./lib/tools')
var etcdjs = require('etcdjs')
var flatten = require('etcd-flatten')
var etcdserver = tools.etcd()
var exec = require('child_process').exec

var etcd = etcdjs('127.0.0.1:4001')


function getStack(){
  var stack = Stack(config, __dirname + '/example', {
    config:config
  })

  return stack
}

etcdserver.stop(tape, true)
etcdserver.reset(tape)
etcdserver.start(tape)
tools.pause(tape, 2)
etcdserver.check(tape)

tape('start host', function(t){
  
  exec('viking host start -d', function(err, stdout, stderr){
    if(err){
      t.fail(err, 'start host')
      return
    }

    if(stderr){
      t.fail(stderr.toString(), 'start host')
      return
    }
  })
})


tape('boot order', function(t){
  var stack = getStack()
  stack.load(function(){
    console.dir(stack._bootOrder)

    t.deepEqual([['mongo', 'redis'],['db', 'logic', 'website', 'help']], stack._bootOrder)
    t.end()  
  })
  
})


tape('phase', function(t){
  var stack = getStack()
  stack.load(function(){

    stack.setPhase('staging')

    t.equal(stack._containers.website.scale, 1, 'there is single scale for non production')
    
    t.end()  
  })
  
})



tape('job', function(t){
  var stack = getStack()
  stack.load(function(){

    stack.setPhase('staging')

    var job = stack.getJob('logic')

    if(!job){
      t.fail('there was no job found')
      t.end()
      return
    }


    t.equal(job.stack, 'ragnar', 'stack')
    t.equal(job.tag, 'default', 'tag')
    t.equal(job.name, 'logic', 'name')
    t.equal(job.phase, 'staging', 'phase')

    t.end()  
  })
  
})

tape('deploy with default tag', function(t){

  var dir = __dirname + '/example'

  exec('viking deploy --app ' + dir, function(err, stdout, stderr){
    if(err){
      t.fail(err, 'deploy default tag')
      return
    }

    if(stderr){
      t.fail(stderr.toString(), 'deploy default tag')
      return
    }

    console.log(stdout.toString())

    etcd.get('/stack', {
      recursive:true
    }, function(err, result){

      if(err || !result){
        t.fail(err, 'load /stack')
        return
      }

      result = flatten(result.node)

      t.ok(result['/stack/ragnar/default/staging'], 'the stack has written itself')

      var obj = JSON.parse(result['/stack/ragnar/default/staging'])

      t.equal(obj.stack.config.name, 'ragnar', 'the stack has been written in JSON')
      
      t.end()
    })
  })

})


tape('check no double deploy', function(t){

  var dir = __dirname + '/example'

  exec('viking deploy --app ' + dir, function(err, stdout, stderr){

    var err = stderr.toString()

    t.ok(err.indexOf('ragnar/default/staging already exists')>=0, 'the error message is correct')
    
    t.end()
    
  })

})

tape('deploy with specific tag and phase', function(t){

  var dir = __dirname + '/example'

  exec('viking deploy -t apples -p production --app ' + dir, function(err, stdout, stderr){
    if(err){
      t.fail(err, 'deploy default tag')
      return
    }

    if(stderr){
      t.fail(stderr.toString(), 'deploy default tag')
      return
    }

    console.log(stdout.toString())

    etcd.get('/stack', {
      recursive:true
    }, function(err, result){

      if(err || !result){
        t.fail(err, 'load /stack')
        return
      }

      result = flatten(result.node)

      t.ok(result['/stack/ragnar/apples/production'], 'the stack has written itself with apples tag')

      var obj = JSON.parse(result['/stack/ragnar/apples/production'])

      t.equal(obj.stack.config.name, 'ragnar', 'the apples stack has been written in JSON')
      
      t.end()
    })
  })

})


tape('destroy stacks', function(t){

  exec('viking destroy ragnar/default/staging', function(err, stdout, stderr){

    exec('viking destroy -s ragnar -t apples -p production', function(err, stdout, stderr){

      etcd.get('/stack', {
        recursive:true
      }, function(err, result){
        if(err){
          t.fail(err, 'load stacks')
          t.end()
          return
        }

        result = flatten(result.node)

        t.equal(Object.keys(result).length, 0, 'there are no stacks after delete')
        t.end()
      })

    })

  })

})


tape('stop host', function(t){
  
  exec('viking host stop', function(err, stdout, stderr){
    if(err){
      t.fail(err, 'stop host')
      return
    }

    if(stderr){
      t.fail(stderr.toString(), 'stop host')
      return
    }
  })
})

etcdserver.stop(tape)
