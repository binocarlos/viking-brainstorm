# plan for viking boom

viking boom is where the vikings arrive and boom

## plan

### arpanet

 * Bootstrap docker-consul client and server nodes
 * arpanet script becomes lightweight wrapper around docker container
 * docker client in arpanet container and unix socket passed in

Arpanet now has a single boot mode that is server or not a server.

All containers are run on each node the only difference is that consul is running with -server on the server nodes.

This makes the whole thing simpler.

DNS and docker are configured and we will switch all the viking routing / KV store onto consul.

The variables needed for each node:

 * HOSTNAME
 * IP

Everything else is configurable but not needed.

Arpanet commands:

 * start
 * stop

When starting - the server flag decides on the consul role.

### gdocks ?

go-lang docker proxy?

### viking

Needs cli tools to analyse consul cluster not etcd state.

### vdocks

Replace all etcd key value stuff with a basic consul client.

### service-cluster

Use the leader module to run a specified job on N servers

### consul modules

 * consul-kv
 * consul-watch
 * consul-leader



