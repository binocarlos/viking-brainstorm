var fs = require('fs');
var toml = require('toml');
var utils = require('component-consoler');
var extend = require('extend');

var config_folder = process.env.VIKING_CONFIG || '/etc/viking';

var autoconfig_path = config_folder + '/auto.conf';
var config_path = config_folder + '/viking.conf';

var volumes = process.env.VIKING_VOLUMES || '/var/lib/viking/volumes';

var toplevel = ['network', 'system'];
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

function get_file_config(path, cfg){
	cfg = cfg || {};
	var newcfg = {};
	if(fs.existsSync(path)){
		try {
		  newcfg = toml.parse(fs.readFileSync(path, 'utf8'));
		} catch (e) {
			console.error('error parsing: ' + config_path);
		  console.error("Parsing error on line " + e.line + ", column " + e.column +
		    ": " + e.message);
		  process.exit(1);
		}
	}

	extend(true, cfg, newcfg);
	return cfg;
}

module.exports = function(args){
	var cfg = {};
	
	cfg = get_file_config(autoconfig_path, cfg);
	cfg = get_file_config(config_path, cfg);
	write_env(cfg);

	toplevel.forEach(function(p){
		if(!cfg[p]){
			cfg[p] = {};
		}
	})

	cfg.system.configpath = config_path;
	cfg.system.volumes = volumes;

	if(cfg.network.tokenpath){
		cfg.network.token = fs.readFileSync(cfg.network.tokenpath, 'utf8');
	}

	envprops.forEach(function(prop){
		var obj = get_obj(cfg, prop);
		var val = obj[get_field(prop)];
		if(!val){
			utils.fatal(prop + ' is required');
		}
	})

	return cfg;
}