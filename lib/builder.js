var fs = require('fs')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var spawn = require('child_process').spawn
var async = require('async');
var Docker = require('./tools/docker')

function Builder(options, etcd){
	EventEmitter.call(this)
	this.options = options || {}

	this.etcd = etcd
	this.stack = options.stack
	this.node = options.node
	this.tag = options.tag
	this.folder = options.folder
	this.dockerFile = options.dockerFile
	this.registry = (options.registry || '').replace(/\/$/, '')
	this.docker = Docker()
}

util.inherits(Builder, EventEmitter)

module.exports = Builder

// the name we use to build the container locally within pushing yet
Builder.prototype.localName = function(splitter){
	return [this.stack, this.tag, this.node].join(splitter || '-')
}

Builder.prototype.saveImageName = function(){
	return this.localName('/')
}

// the name of the container in the registry
Builder.prototype.remoteName = function(){
	var self = this;
	return [self.registry, this.stack, this.tag + '-' + this.node].join('/')
}

Builder.prototype.getDockerFile = function(){
	var self = this;
	var dockerFile = this.dockerFile
	var from = dockerFile.from
	if(from.match(/^viking:/)){
		from = dockerFile.from.replace(/^viking:/, '')
		var parts = from.split('/')
		from = parts[0] + '-' + this.tag + '-' + parts[1]
	}

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

	return DockerFile
}

Builder.prototype.cleanup = function(done){
	var self = this;
	this.docker.imageId(this.localName(), function(err, id){

		async.forEachSeries([
			self.remoteName(),
			id
		], function(name, nextName){

			var args = [
				'rmi',
				name
			]

			var rmi = spawn('docker', args, {
				cwd:this.folder,
				stdio:'inherit'
			})

			rmi.on('error', nextName)
			rmi.on('close', nextName)
			
		}, done)
	})

}

Builder.prototype.build = function(done){
	var self = this;
	var dockerFile = this.dockerFile
	var dockerFilePath = this.folder + '/Dockerfile'
	var existedContents = null

	var DockerFile = this.getDockerFile()

	console.log('[dev build] ' + this.localName() + ' start')

	console.log('build dockerfile')
	console.log(JSON.stringify(DockerFile, null, 4))

	fs.writeFileSync(dockerFilePath, DockerFile.join("\n"), 'utf8')

	//var tag = self.registry + this.stack + '/' + this.node + ':' + this.tag

	var localName = this.localName()
	
	var args = [
		'build',
		'--rm=true',
		'-t',
		localName,
		'.'
	]

	var dockerBuild = spawn('docker', args, {
		cwd:this.folder,
		stdio:'inherit'
	})

	dockerBuild.on('error', function(err){
		console.error(err)
		process.exit(1)
	})
	dockerBuild.on('close', function(code){
		if(code!=0){
			return done('docker build for ' + self.localName() + ' returned a non-zero exit code')
		}
		console.log('[dev build] ' + self.stack + '/' + self.node + ' done')
		fs.unlinkSync(dockerFilePath)
		done()
	})
}


Builder.prototype.tagImage = function(done){
	var self = this;
	console.log('[tag] ' + self.stack + '/' + self.node)

	var args = [
		'tag',
		self.localName(),
		self.remoteName()
	]

	var dockerTag = spawn('docker', args, {
		stdio:'inherit'
	})

	dockerTag.on('error', done)
	dockerTag.on('close', function(code){
		if(code!=0){
			return next('docker tag for ' + self.localName() + ' returned a non-zero exit code')
		}
		console.log('[push] ' + self.stack + '/' + self.tag + ' - ' + self.node)
		return done()
	})
}

Builder.prototype.push = function(done){

	var self = this;
	async.series([
	  function(next){
	  	self.tagImage(next)
	  },

	  function(next){

			var args = [
				'push',
				self.remoteName()
			]

			var dockerPush = spawn('docker', args, {
				stdio:'inherit'
			})

			dockerPush.on('error', next)
			dockerPush.on('close', function(code){
				if(code!=0){
					return next('docker push for ' + self.remoteName() + ' returned a non-zero exit code')
				}
				return next()
			})
	  }
	], done)

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