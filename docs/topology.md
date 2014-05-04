# topology

A viking network consists of three main roles:

 * leader
 * master
 * slave

A leader is running the co-ordination code for the network.

A master is a potential leader.

A slave is waiting for jobs to run.

## modules

### builder

This turns a viking.yml + code into docker containers either locally or on a remote registry

### config

The config file that scans the environment and /etc/viking

### container

Represents a single container running on the local docker host

### deployed

The etcd database of currently running containers

### dispatch

Listens to the schedule and reacts to events by creating jobs on hosts

### docker

General docker wrapper

### dockerrun

Run a docker process with special viking options

### host

The top level node.js process that runs on all viking servers

This is launched with mon

### hostmonitor

Writes server metrics to /host which announces a server on the network

### network

Etcd database of hosts

### process

A wrapper for running a process with mon

### schedule

The etcd database of intented jobs to be run

### sink

The process running on a viking-slave that runs jobs

### stack

The wrapper for a viking.yml stack

### vikingfile

The wrapper for a vikingfile config

### volume

The wrapper for a docker volume
