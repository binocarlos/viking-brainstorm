var tools = require('./tools')
var Job = require('../../tools/job')
var getCandidatesForJob = require('./getcandidates')
var pickServerFromCandidates = require('./pickserver')
var filterCandidatesForDuplicates = require('./filterduplicates')
// temporarily record the state so the next allocation has a good picture
// this means we can do a batch of allocations without actually commiting them
function injectJobIntoState(job, hostname, state){

	state.run['/' + job.id] = hostname
	state.deploy['/' + hostname + '/' + job.id] = job.id
	
}

function allocateServer(etcd, job, state, done){

	var candidates = getCandidatesForJob(job, state.host)

	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('candidates before')
	console.dir(candidates)


	candidates = filterCandidatesForDuplicates(job, candidates, state.run)


	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('candidates after')
	console.dir(candidates)

	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('-------------------------------------------');
	console.log('state')
	console.dir(state.run)

	if(!candidates || !candidates.length){
		return done()
	}

	pickServerFromCandidates(etcd, state, job, candidates, function(err, server){
		if(err) return done(err)
		if(!server) return done()
		injectJobIntoState(job, server.name, state)
		done(null, server)
	})
}

module.exports = allocateServer