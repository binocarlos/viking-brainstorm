var Stack = require('../lib/stack')
var config = require('../lib/config')()
var tape     = require('tape')


function getStack(){
  var stack = Stack(config, __dirname + '/example', {
    config:config
  })

  return stack
}


tape('boot order', function(t){
  var stack = getStack()
  stack.load(function(){
    console.dir(stack._bootOrder)

    t.deepEqual(['db', 'mongo', 'redis', 'logic', 'website', 'help'], stack._bootOrder)
    t.end()  
  })
  
})