var fs = require('fs');
var yaml = require('js-yaml');
var utils = require('component-consoler');
var extend = require('extend');

var config_folder = process.env.VIKING_CONFIG || '/etc/viking';

var defaultConfig = __dirname + '/../config.yaml'
var autoconfig_path = config_folder + '/auto.conf';
var config_path = config_folder + '/viking.conf';

var base = process.env.VIKING_BASE || '/var/lib/viking';
var volumes = process.env.VIKING_VOLUMES || '/var/lib/viking/volumes';
var pids = process.env.VIKING_PIDS || '/var/run/viking';
var logs = process.env.VIKING_LOGS || '/var/log/viking';

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
		newcfg = yaml.safeLoad(fs.readFileSync(path, 'utf8'))
	}

	extend(true, cfg, newcfg);
	return cfg;
}

module.exports = function(args){
	var cfg = yaml.safeLoad(fs.readFileSync(defaultConfig, 'utf8'));
	
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
	cfg.system.pids = pids;
	cfg.system.logs = logs;

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

	cfg.network.etcd = cfg.network.etcd.split(/\s*,\s*/)

	return cfg;
}