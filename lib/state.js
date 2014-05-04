// the leader runs the registry and the git push
var utils = require('component-consoler');
var async = require('async')
var EventEmitter = require('events').EventEmitter

// Because planning - Hugh Dowding (in case you were wandering)
module.exports = function(etcd, done){

	var procs = {}
	var runs = {}

	function processProc(proc){
		if(!proc){
			return
		}
		if(proc.dir){
			(proc.nodes || []).forEach(processProc)
		}
		else{
			procs[proc.key.replace(/^\/proc/, '')] = JSON.parse(proc.value)
		}
	}

	function processRun(run){
		if(!run){
			return
		}
		if(run.dir){
			(run.nodes || []).forEach(processRun)
		}
		else{
			runs[run.key.replace(/^\/run/, '')] = run.value
		}
	}

	async.parallel({
		proc:function(next){
			etcd.get('/proc', {
				recursive:true
			}, function(err, data){
				if(err){
					return next(err)
				}
				if(!data){
					return next();
				}
				next(null, data.node)
			})
		},
		run:function(next){
			etcd.get('/run', {
				recursive:true
			}, function(err, data){
				if(err){
					return next()
				}
				if(!data){
					return next();
				}
				next(null, data.node)
			})
		}
	}, function(err, data){
		if(err){
			return done(err)
		}

		processProc(data.proc)
		processRun(data.run)

		done(null, {
			proc:procs,
			run:runs
		})
	})
}