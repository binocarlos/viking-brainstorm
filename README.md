viking
======

Docker PaaS Platform for node.js applications.

The main objective of viking is to help you move westward and colonize server-farms with viking apps.

STATUS - PRE-ALPHA

```
         _  _     _               
 /\   /\(_)| | __(_) _ __    __ _ 
 \ \ / /| || |/ /| ||  _ \  / _, |
  \ V / | ||   < | || | | || (_| |
   \_/  |_||_|\_\|_||_| |_| \__, |
                            |___/ 
```

## installation

```
$ wget -qO- https://raw.github.com/binocarlos/viking/master/bootstrap.sh | sudo bash
```

If you are creating a new viking cluster then you will need a new etcd discovery token:

```
$ curl https://discovery.etcd.io/new
```

Copy this token - you will need it for when you scale up your viking cluster.

### vagrant

If you are running under vagrant - you can export the token into your environment and it will be auto-applied to the three viking hosts:

On Windows host:

```
set VIKING_TOKEN=https://discovery.etcd.io/66958af567f960751d3eee17f062aa44
```

On Linux/Mac host:

```
export VIKING_TOKEN=https://discovery.etcd.io/66958af567f960751d3eee17f062aa44
```

Then you can 'vagrant up' and all three viking hosts will be talking to each other.

## usage

First you must configure each viking host.

If you have scaled using viking - this will be done automatically.

If you are managing a static network with viking - you must do this when you create a new server.

If you are using vagrant for a development viking - you just need to set the VIKING_TOKEN variable on your host and then 'vagrant up'.

### config

The configuration of a viking host is done via the /etc/viking/viking.conf file which is in [TOML](https://github.com/mojombo/toml/blob/master/versions/toml-v0.2.0.md) format.

```toml
[network]
hostname = "viking-1"
token = "https://discovery.etcd.io/11c2f874054099f8b176d9d9aa70d601"
tokenpath = '/etc/viking/mytoken'
public = "87.45.28.3"
private = "10.11.12.13"
```

The settings:

#### network

 * hostname - the hostname of the viking node
 * token - the network etcd discovery token
 * tokenpath - a path to a file that contains the token
 * public - the public IP of the node
 * private - the private IP of the node

### env

viking is also configured via environment variables - if these are set they will override the config file:

#### network

 * VIKING_NETWORK_HOSTNAME
 * VIKING_NETWORK_TOKEN
 * VIKING_NETWORK_TOKENPATH
 * VIKING_NETWORK_PUBLIC
 * VIKING_NETWORK_PRIVATE

### overrides

These env vars allow you to change where the viking host will look for settings.

 * VIKING_CONFIG - alternative location for config file to load from (/etc/viking/viking.conf)
 * VIKING_VOLUMES - alternative data folder for volumes (/var/lib/viking/volumes)

