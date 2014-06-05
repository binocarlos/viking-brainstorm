var tools = module.exports = {
	sortCandidates:function sortCandidates(a,b) {
	  if (a.score < b.score)
	     return 1
	  if (a.score > b.score)
	    return -1
	  return 0;
	},
	chooseByHostname:function chooseByHostname(servers, hostname){
		var ret = servers.filter(function(s){
			return tools.serverHostname(s)==hostname
		})
		return ret[0]
	},
	serverHostname:function serverHostname(s){
		return s.config.network.hostname
	}
}