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

tape('boot order', function(t){
  var stack = getStack()
  stack.load(function(){
    console.dir(stack._bootOrder)

    t.deepEqual([['mongo', 'redis'],['db', 'logic', 'website', 'help']], stack._bootOrder)
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

      t.ok(result['/stack/ragnar/tags/default'], 'the stack has written itself')

      var obj = JSON.parse(result['/stack/ragnar/tags/default'])

      t.equal(obj.config.name, 'ragnar', 'the stack has been written in JSON')
      
      t.end()
    })
  })

})


etcdserver.stop(tape)