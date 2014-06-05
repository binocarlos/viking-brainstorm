var tools = require('./tools')
var Job = require('../../tools/job')
var deck = require('deck')
var leastBusy = require('./leastbusy')

// the servers have been filtered
// pick one based on:
//
// 1. fixed - is the job fixed
// 2. load - the least busy server
// 
function pickServerFromCandidates(etcd, state, job, servers, done){
	var jobObject = Job(job)

	// this means we have to write to /fixed/[stack]/[name]/[id] = hostname
	// then we can re-deploy to the same place
	if(jobObject.isFixed()){

		function chooseNew(){
			var server = leastBusy(servers, state)

			etcd.set('/fixed' + jobObject.key(), tools.serverHostname(server), function(err){
				done(err, server)
			})
		}

		etcd.get('/fixed/' + jobObject.key(), function(err, serverName){
			if(serverName){
				var server = tools.chooseByHostname(servers, serverName)
				if(server){
					done(null, server)
				}
				else{
					chooseNew()
				}
			}
			else{
				chooseNew()
			}

		})
	}
	else{
		done(null, leastBusy(servers, state))
	}
}

module.exports = pickServerFromCandidates