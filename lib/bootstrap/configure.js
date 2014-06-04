// this runs on all vikings with an etcd client to listen for events
var exec = require('child_process').exec
var async = require('async')
var config = require('../config')()
var env = require('../tools/env')
var fs = require('fs')
var config_tree = require('config-tree');
var read = require('read')
var ghauth = require('ghauth')
var authOptions = {
  configName : 'viking'
, scopes     : [ 'user' ]
, note       : 'viking'
, userAgent  : 'viking'
}
module.exports = function(opts){

	return {
		boot:function(){

			var props = [{
				section:'AWS'
			},{
				title:'AWS Key',
				env:'AWS_KEY'
			},{
				title:'AWS Secret',
				env:'AWS_SECRET'
			},{
				title:'AWS Registry Bucket',
				env:'REGISTRY_AWS_BUCKET',
				default: 'vikingdockerregistry'
			},{
				section:'Digital Ocean'
			},{
				title:'Digital Ocean Key',
				env:'DO_KEY'
			},{
				title:'Digital Ocean Secret',
				env:'DO_SECRET'
			}]

			env.load('core', function(err, values){

				values = values || {}

				ghauth(authOptions, function (err, authData) {

					async.forEachSeries(props, function(prop, nextProp){

						if(prop.section){
							console.log('-------------------------------------------');
							console.log(prop.section)
							console.log('-------------------------------------------');
							return nextProp()
						}
						else if(prop.env){
								
							read({
								prompt: prop.title + ':',
								default: values[prop.env] || prop.default
							}, function (err, val) {
								values[prop.env] = val
								nextProp()
							})							
						}
						else{
							return nextProp()
						}



					}, function(err){

						values.GITHUB_USER = authData.user
						values.GITHUB_TOKEN = authData.token

						env.save('core', values, function(){
							console.dir(values)
						})

					})
				  
				})

			})		
		}
	}
	
}
