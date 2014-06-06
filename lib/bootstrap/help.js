var fs = require('fs')
var logger = require('../tools/logger')

module.exports = function(cmd){
	cmd = cmd || 'viking'
	var helpPath = __dirname + '/../../files/help/' + cmd + '.txt'
	if(!fs.existsSync(helpPath)){
		logger.error('help not found for: ' + cmd)
	}
	else{
		console.log('')
		console.log(fs.readFileSync(helpPath, 'utf8'))
		console.log('')
	}
}