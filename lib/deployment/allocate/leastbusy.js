var tools = require('./tools')
var deck = require('deck')

function chooseLeastBusy(servers, state){

	var counts = {}
	var serverMap = {}

	servers.forEach(function(server){
		serverMap[server.name] = server
		counts[server.name] = 0
	})

	Object.keys(state.run || {}).forEach(function(key){
		var hostname = state.run[key]
		counts[hostname] = counts[hostname] || 0
		counts[hostname]++
	})

	var objs = Object.keys(serverMap || {}).map(function(key){
		return {
			score:counts[key],
			id:key
		}
	})

	objs.sort(tools.sortCandidates)
	objs.reverse()

	var lowScore = null
	objs = objs.filter(function(obj){
		if(lowScore===null){
			lowScore = obj.score
		}
		return obj.score==lowScore
	})

	var obj = deck.pick(objs)
	return serverMap[obj.id]
}

module.exports = chooseLeastBusy