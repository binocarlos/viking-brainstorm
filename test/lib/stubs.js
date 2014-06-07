var async = require('async')

var procs = {
  "test1":{
    stack:'test',
    name:'test1',
    image:'test1',
    filter:[{
      tag:'system',
      flexible:true
    }],
    ports:[
      '80'
    ],
    env:{
      TEST:10
    }
  },
  "test2":{
    stack:'test',
    name:'test2',
    image:'test2',
    ports:[
      '80'
    ],
    env:{
      TEST:11
    }
  },
  "test3":{
    stack:'test',
    name:'test3',
    image:'test3',
    ports:[
      '80'
    ],
    env:{
      TEST:12
    }
  },
  "test4":{
    stack:'test',
    name:'test4',
    image:'test4',
    ports:[
      '80'
    ],
    env:{
      TEST:13
    }
  },
  "test5":{
    stack:'test',
    name:'test5',
    image:'test5',
    ports:[
      '80'
    ],
    env:{
      TEST:14
    }
  },
  "test6":{
    stack:'test',
    name:'test6',
    image:'test6',
    ports:[
      '80'
    ],
    env:{
      TEST:15
    }
  },
  "test7":{
    stack:'test',
    name:'test7',
    image:'test7',
    ports:[
      '80'
    ],
    env:{
      TEST:16
    }
  },
  "registry":{
    stack:'core',
    name:'registry',
    image:'registry',
    filter:[{
      tag:'system',
      flexible:true
    }],
    ports:[
      '5000:5000'
    ]
  }
}


var sametagprocs = {
  "batcha":{
    stack:'test',
    tag:'a',
    name:'test',
    image:'test',
    scale:3,
    ports:[
      '80'
    ],
    env:{
      TEST:10
    }
  },
  "batchb":{
    stack:'test',
    tag:'b',
    name:'test',
    image:'test',
    scale:3,
    ports:[
      '80'
    ],
    env:{
      TEST:10
    }
  },
  "batchc":{
    stack:'test',
    tag:'c',
    name:'test',
    image:'test',
    scale:3,
    ports:[
      '80'
    ],
    env:{
      TEST:10
    }
  },
  "batchd":{
    stack:'test',
    tag:'d',
    name:'test',
    image:'test',
    scale:3,
    ports:[
      '80'
    ],
    env:{
      TEST:10
    }
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


function shuffle(array) {
  var currentIndex = array.length
    , temporaryValue
    , randomIndex
    ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}



module.exports = {
	network:function(etcd, done){
		async.forEachSeries(Object.keys(hosts || {}), function(key, nextKey){
			var server = hosts[key]
			etcd.set('/host/' + server.name + '/config', JSON.stringify(server), nextKey)
		}, done)
	},
  singlenetwork:function(etcd, done){
    var server = hosts['viking-0']
    etcd.set('/host/' + server.name + '/config', JSON.stringify(server), done)
  },
  proc:function(schedule, done){
    async.forEachSeries(Object.keys(procs || {}), function(key, nextKey){
      var proc = procs[key]
      schedule.writeJob(proc, nextKey)
    }, done)
  },
  sametagproc:function(schedule, done){
    var procs = Object.keys(sametagprocs || {})
    procs = shuffle(procs)
    async.forEachSeries(procs, function(key, nextKey){
      setTimeout(function(){
        var proc = sametagprocs[key]
        schedule.writeJob(proc, nextKey)
      }, 1000)
    }, done)
  }
}