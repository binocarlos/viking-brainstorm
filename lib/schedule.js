// the leader runs the registry and the git push
var utils = require('component-consoler');
var util = require('./tools/utils')
var async = require('async')
var Map = require('./map')

module.exports = function(etcd){

	var map = Map(etcd)

	function ensureJob(job, done){
			
		map.ps(job.stack, job.name, function(err, results){
			console.log('-------------------------------------------');
			console.log('existing')
			if(results.length<=0){

			}
			else{
				done()
			}
		})
	}

	function writeJob(job, done){
		job.id = util.littleid()
		utils.log('schedule write', job.stack + ' - ' + job.name)

		var path = '/' + ['schedule', job.stack, job.name, job.id].join('/')
		etcd.set(path, job, function(){

		})
	}

	return {

		ensure:ensureJob,
		write:writeJob
	}

}