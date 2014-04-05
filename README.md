viking
======

Docker PaaS Platform for node.js applications

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

## usage


### config

The configuration of viking is done via the /etc/viking/viking.conf file which is in [TOML](https://github.com/mojombo/toml/blob/master/versions/toml-v0.2.0.md) format.

```toml
[network]
hostname = "viking-1"
token = "https://discovery.etcd.io/11c2f874054099f8b176d9d9aa70d601"
public = "87.45.28.3"
private = "10.11.12.13"
```

The settings:

 * network.hostname - the hostname of the viking node
 * network.token - the network etcd discovery token
 * network.public - the public IP of the node
 * network.private - the private IP of the node

### env

viking is also configured via environment variables - if these are set they will override the config file:

 * VIKING_NETWORK_HOSTNAME
 * VIKING_NETWORK_TOKEN
 * VIKING_NETWORK_PUBLIC
 * VIKING_NETWORK_PRIVATE

special environment variables:

 * VIKING_CONFIG - alternative location for config file to load from

