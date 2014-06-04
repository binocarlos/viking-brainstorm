var fs = require('fs')
module.exports = function(update){
	var conf = {}
	if(fs.existsSync('~/viking.json')){
		conf = fs.readFileSync('~/viking.json', 'utf8')
		conf = JSON.parse(data)
	}

	Object.keys(update || {}).forEach(function(key){
		conf[key] = update[key]
	})

	fs.writeFileSync('~/viking.json', JSON.stringify(conf, null, 4), 'utf8')

	return conf
}