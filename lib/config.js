var fs = require('fs');
var toml = require('toml');
var utils = require('component-consoler');

var config_path = process.env.VIKING_CONFIG || '/etc/viking/viking.conf';
var envprops = ['network.public', 'network.private', 'network.hostname', 'network.token'];

function get_field(path){
	var parts = path.split('.');
	var last = parts.pop();
	return last;
}

function get_obj(cfg, prop){
	var parts = prop.split('.');
	var current = cfg;
	while(parts.length>0){
		var prop = parts.shift();
		if(parts.length>0){
			var next = current[prop];
			if(!next){
				next = current[prop] = {};
			}
			current = next;
		}
		else{
			return current;
		}
	}
}

function write_env(cfg){
	envprops.forEach(function(prop){
		var envname = 'VIKING_' + prop.replace(/\./g, '_').toUpperCase();
		if(process.env[envname]){{
			var current = get_obj(cfg, prop);
			current[get_field(prop)] = process.env[envname];
		}}
	})
	return cfg;
}

module.exports = function(args){
	var cfg = {};
	if(fs.existsSync(config_path)){
		try {
		  cfg = toml.parse(fs.readFileSync(config_path, 'utf8'));
		} catch (e) {
			console.error('error parsing: ' + config_path);
		  console.error("Parsing error on line " + e.line + ", column " + e.column +
		    ": " + e.message);
		  process.exit(1);
		}
	}

	write_env(cfg);

	['network'].forEach(function(p){
		if(!cfg[p]){
			cfg[p] = {};
		}
	})

	envprops.forEach(function(prop){
		var obj = get_obj(cfg, prop);
		var val = obj[get_field(prop)];
		if(!val){
			utils.fatal(prop + ' config is required');
		}
	})

	return cfg;
}