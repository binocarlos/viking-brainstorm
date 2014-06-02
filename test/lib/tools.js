var spawn = require('child_process').spawn
var exec = require('child_process').exec
var async = require('async');
var etcdjs = require('etcdjs')
var flatten = require('etcd-flatten')
var tape     = require('tape')
var config = require('../../lib/config')()
var concat = require('concat-stream')
var spawnargs = require('spawn-args')
var state = {}

function runCommands(commands, done){

	async.forEachSeries(commands, function(command, nextCmd){

		var args = spawnargs(command)

		var cmd = args.shift()
		var p = spawn(cmd, args, {
			stdio:[null, process.stdout, process.stderr]
		})

		p.on('error', nextCmd)
		p.on('close', nextCmd)
	}, done)
}

function stack(){
	return {
		start:function(tape){

			tape('reset viking servers', function(t){

				var commands = [
					'ssh viking-0 /bin/bash -c "cd /srv/projects/viking && make clean"',
					'ssh viking-1 /bin/bash -c "cd /srv/projects/viking && make clean"',
					'ssh viking-2 /bin/bash -c "cd /srv/projects/viking && make clean"'
				]

				runCommands(commands, function(err){
					if(err){
						t.fail(err)
						return t.end()
					}

					t.pass('vikings reset')
					t.end()

				})

			})

			tape('start viking servers', function(t){

				var commands = [
					'ssh viking-0 viking start --seed',
					'ssh viking-1 viking start',
					'ssh viking-2 viking start'
				]

				runCommands(commands, function(err){
					if(err){
						t.fail(err)
						return t.end()
					}

					t.pass('vikings started')
					t.end()

				})

			})
		},

		stop:function(tape){

			tape('shutdown', function(t){

				var host = [
					'ssh viking-2 viking host stop --clean',
					'ssh viking-1 viking host stop --clean',
					'ssh viking-0 viking host stop --clean'
				]

				var etcd = [
					'ssh viking-2 viking etcd stop',
					'ssh viking-1 viking etcd stop'
				]

				var lastEtcd = [
					'ssh viking-0 viking etcd stop'
				]

				runCommands(host, function(err){
					if(err){
						t.fail(err)
						return t.end()
					}

					t.pass('viking hosts stopped')


					runCommands(etcd, function(err){
						if(err){
							t.fail(err)
							return t.end()
						}

						t.pass('viking etcds stopped')

						setTimeout(function(){
							runCommands(lastEtcd, function(err){


								t.pass('viking master etcd stopped')
								t.end()
							})	
						}, 2000)
						
					})

				})
			  

			})
		}
	}
}

module.exports = {
	stack:stack,
	runCommands:runCommands
}
