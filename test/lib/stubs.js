var async = require('async')

var proc = {
    "test1":{

    },
    "test2":{

    },
    "registry":{
        
    }
}

var hosts = {
    "viking-0": {
        "name": "viking-0",
        "config": {
            "system": {
                "containers": [
                    "core-etcd"
                ],
                "configpath": "/etc/viking/viking.conf",
                "volumes": "/var/lib/viking/volumes",
                "pids": "/var/run/viking",
                "logs": "/var/log/viking"
            },
            "master": true,
            "slave": true,
            "env": "development",
            "tags": "system",
            "network": {
                "hostname": "viking-0",
                "public": "192.168.8.120",
                "private": "192.168.8.120",
                "tokenpath": "/vagrant/.vagrant/vikingtoken",
                "etcd": "127.0.0.1:4001",
                "token": "https://discovery.etcd.io/672e0027e6dfceed7670a7428e770477"
            }
        }
    },
    "viking-1": {
        "name": "viking-1",
        "config": {
            "system": {
                "containers": [
                    "core-etcd"
                ],
                "configpath": "/etc/viking/viking.conf",
                "volumes": "/var/lib/viking/volumes",
                "pids": "/var/run/viking",
                "logs": "/var/log/viking"
            },
            "master": true,
            "slave": true,
            "env": "development",
            "tags": null,
            "network": {
                "hostname": "viking-1",
                "public": "192.168.8.121",
                "private": "192.168.8.121",
                "tokenpath": "/vagrant/.vagrant/vikingtoken",
                "etcd": "127.0.0.1:4001",
                "token": "https://discovery.etcd.io/672e0027e6dfceed7670a7428e770477"
            }
        }
    },
    "viking-2": {
        "name": "viking-2",
        "config": {
            "system": {
                "containers": [
                    "core-etcd"
                ],
                "configpath": "/etc/viking/viking.conf",
                "volumes": "/var/lib/viking/volumes",
                "pids": "/var/run/viking",
                "logs": "/var/log/viking"
            },
            "master": true,
            "slave": true,
            "env": "development",
            "tags": null,
            "network": {
                "hostname": "viking-2",
                "public": "192.168.8.122",
                "private": "192.168.8.122",
                "tokenpath": "/vagrant/.vagrant/vikingtoken",
                "etcd": "127.0.0.1:4001",
                "token": "https://discovery.etcd.io/672e0027e6dfceed7670a7428e770477"
            }
        }
    }
}


module.exports = {
	network:function(etcd, done){
		async.forEachSeries(Object.keys(hosts || {}), function(key, nextKey){
			var server = hosts[key]
			etcd.set('/host/' + server.name + '/config', JSON.stringify(server), nextKey)
		}, done)
	}
}