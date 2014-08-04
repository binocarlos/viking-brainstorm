## commands

Viking is a composable command line application that can be triggered from a HTTP server.

The idea is you can easily affect changes in how viking behaves without breaking comptability with any clients.

Here is an overview:

```
viking client cli
		 |
		 |
		 |
HTTP Server
     |
     |
     |
 server CLI
```

this enables different parts of the platform to be replaced with other parts

## docker

these commands are compatable with the docker client pointing at a viking HTTP server:

```
docker -H http://127.0.0.1:8791 ps -A
```

### ps

list the containers across the cluster

### attach

### run

### stop

### rm


## custom

these commands do not have a docker equivalent and must be run directly

```
viking hosts
```

### hosts

list the hosts on the network

### filter

filter the list of hosts based on a job

### allocate_port


