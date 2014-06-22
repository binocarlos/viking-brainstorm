// return a filtered list of condidates based on the state
function filterDuplicates(job, candidates, runState){

	// the servers already running the job
	var runMap = {}

	var jobId = '/' + job.stack + '/' + job.tag + '/' + job.name

	Object.keys(runState || {}).forEach(function(key){
		if(key.indexOf(jobId)==0){
			runMap[runState[key]] = true
		}
	})

	return candidates.filter(function(candidate){
		return !runMap[candidate.name]
	})
}

module.exports = filterDuplicates