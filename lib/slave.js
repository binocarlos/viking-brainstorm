// the leader runs the registry and the git push
var utils = require('component-consoler');
var Sink = require('./sink')
var async = require('async')

module.exports = function(config, etcd){

	var sink = Sink(config, etcd)


	return {
		start:function(done){

			async.series([

				function(next){

					sink.start(next)

				}

			], done)
			
		},
		stop:function(done){
			
			async.series([
				function(next){

				}

			], done)
		}
	}
}