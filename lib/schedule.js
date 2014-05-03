// the leader runs the registry and the git push
var utils = require('component-consoler');
var util = require('./tools/utils')
var async = require('async')
var Map = require('./map')

module.exports = function(config, etcd){

	var map = Map(etcd)

	function ensureJob(job, done){
		map.ps(job, function(err, results){
			if(err){
				return done(err)
			}
			if(results.length<=0){
				writeJob(job, done)
			}
			else{
				done()
			}
		})
	}

	function writeJob(job, done){
		job.id = util.littleid()
		utils.log('schedule write', job.stack + ' - ' + job.name)
		var key = util.jobKey('proc', job)
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.dir(key)
		etcd.set(key, JSON.stringify(job), done)
	}

	function removeJob(job, done){
		etcd.del(util.jobKey('proc', job), {
			recursive:true,
			dir:true
		}, done)
	}

	function removeAll(done){
		etcd.del('/proc', {
			recursive:true,
			dir:true
		}, done)
	}

	function list(filter, done){
		etcd.get('/proc', {
			recursive:true
		}, done)
	}

	return {
		ensure:ensureJob,
		write:writeJob,
		remove:removeJob,
		removeAll:removeAll
	}

}