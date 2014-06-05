var tools = require('./tools')
var Job = require('../../tools/job')

function getHostTags(host){
	var ret = {}
	var tags = (host.config.tags || '').split(/\s+/)
	tags.forEach(function(t){
		ret[t] = true
	})
	return ret
}

function getHostScore(job, host){
	var jobObject = Job(job)
	var hostTags = getHostTags(host)
	var filters = job.filter || []
	var failed = false
	var score = 0

	filters.forEach(function(filter){
		if(filter.flexible){
			if(hostTags[filter.tag]){
				score++
			}
			score++
		}
		else{
			if(!hostTags[filter.tag]){
				failed = true
			}
		}
	})

	if(failed){
		score = 0
	}
	else if(score==0){
		score = 1
	}
	return score
}

function getCandidatesForJob(job, hosts){
	var candidates = Object.keys(hosts || {}).map(function(key){
		var host = hosts[key]
		var score = getHostScore(job, host)
		return {
			host:host,
			score:score
		}
	}).filter(function(result){
		return result.score>0
	})
	candidates.sort(tools.sortCandidates)
	var highScore = null
	candidates = candidates.filter(function(candidate){
		if(!highScore){
			highScore = candidate.score
		}
		return candidate.score==highScore
	})			
	return candidates.map(function(c){
		return c.host
	})
}

module.exports = getCandidatesForJob