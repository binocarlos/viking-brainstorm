var fs = require('fs')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var spawn = require('child_process').spawn
var utils = require('component-consoler');

function Builder(options){
	EventEmitter.call(this)
	this.options = options || {}

	this.stack = options.stack
	this.node = options.node
	this.folder = options.folder
	this.dockerFile = options.dockerFile
	this.registry = options.registry || ''

	if(this.registry.length){
		if(this.registry.charAt(this.registry.length-1)!='/'){
			this.registry += '/'	
		}
	}

}

util.inherits(Builder, EventEmitter)

module.exports = Builder

Builder.prototype.build = function(done){
	var self = this;
	var dockerFile = this.dockerFile
	var dockerFilePath = this.folder + '/Dockerfile'
	var existedContents = null

	var oldFile = fs.existsSync(dockerFilePath)

	if(oldFile){
		existedContents = fs.readFileSync(dockerFilePath, 'utf8')
	}

	function returnOldDockerFile(){
		if(oldFile){
			fs.writeFileSync(dockerFilePath, existedContents, 'utf8')
		}
	}

	var from = dockerFile.from.replace(/^viking:/, this.registry)

	var DockerFile = [
		'FROM ' + from
	]

	var add = dockerFile.add || []
	var run = dockerFile.run || []

	add.forEach(function(elem){
		DockerFile.push('ADD ' + elem.source + ' ' + elem.dest)
	})

	run.forEach(function(elem){
		DockerFile.push('RUN ' + elem)
	})

	if(dockerFile.workdir){
		DockerFile.push('WORKDIR ' + dockerFile.workdir)
	}

	if(dockerFile.entrypoint){
		DockerFile.push('ENTRYPOINT ' + dockerFile.entrypoint)
	}

	utils.log('dev build ' + this.stack + '/' + this.node, 'start')

	fs.writeFileSync(dockerFilePath, DockerFile.join("\n"), 'utf8')

	console.dir(DockerFile)

	var tag = self.registry + this.stack + '/' + this.node

	var dockerBuild = spawn('docker', [
		'build',
		'--rm=true',
		'-t',
		tag,
		'.'
	], {
		cwd:this.folder,
		stdio:'inherit'
	})

	self._tag = tag

	dockerBuild.on('error', function(err){
		console.error(err)
		process.exit(1)
	})
	dockerBuild.on('close', function(){
		utils.log('dev build ' + self.stack + '/' + self.node, 'done')
		fs.unlinkSync(dockerFilePath)
		done(null, tag)
	})
}		

// dockerFile is a single pojo from dockerfile-parse
module.exports = function(options, done){

	options = options || {}

	if(!options.node){
		return done('node name needed')
	}

	if(!options.stack){
		return done('stack name needed')
	}

	var builder = new Builder(options)

	if(!builder.dockerFile){
		return done('dockerFile needed')
	}

	if(!fs.existsSync(builder.folder)){
		return done('folder: ' + builder.folder + ' does not exist')
	}

	return builder
}