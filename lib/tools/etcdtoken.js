var hyperquest = require('hyperquest')
var concat = require('concat-stream')

module.exports = function(done){
	var req = hyperquest
		.get('https://discovery.etcd.io/new')
		.pipe(concat(function(token){
			done(null, token.toString())
		}))

	req.on('error', done)
}