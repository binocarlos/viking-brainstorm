var EventEmitter = require('events').EventEmitter
var util = require('util')
var ejs = require('ejs')
var fs = require('fs')
var exec = require('child_process').exec

function Supervisor(){
  EventEmitter.call(this)
}

util.inherits(Supervisor, EventEmitter)

module.exports = Supervisor

// write a supervisor service file
Supervisor.prototype.writeProgram = function(name, cmd, done){
	var templateContent = fs.readFileSync(__dirname + '/../files/supervisor/program.ejs', 'utf8')
	var supervisorConfig = ejs.render(templateContent, {
		name:name,
		cmd:cmd
	})
	fs.writeFileSync('/tmp/viking.supervisor.' + name + '.conf', supervisorConfig, 'utf8')
	exec('sudo mv /tmp/viking.supervisor.' + name + '.conf /etc/supervisor/conf.d/' + name + '.conf', done)
}

Supervisor.prototype.writeGroup = function(name, programs, done){
	var templateContent = fs.readFileSync(__dirname + '/../files/supervisor/group.ejs', 'utf8')
	var supervisorConfig = ejs.render(templateContent, {
		name:name,
		programs:programs || []
	})
	fs.writeFileSync('/tmp/viking.supervisor.' + name + '.conf', supervisorConfig, 'utf8')
	exec('sudo mv /tmp/viking.supervisor.' + name + '.conf /etc/supervisor/conf.d/' + name + '.conf', done)
}

module.exports = function(){
  return new Supervisor()
}