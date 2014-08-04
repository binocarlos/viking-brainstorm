# v2 namespace

stacks are named by the command line switch

example stack on github.com/binocarlos/example-stack

```yaml
mongo:
	image: quarry/mongo
	expose 27017
	volume: /data/db
```

This stack has 1 job named mongo.

When the stack is pushed - it will create container configs from the jobs.

How a container is named depends on the following rules applied to the job:

### scalable

A job is scalable if it is stateless.

A job is stateless if it does not mention any volumes.


### stack names

The name of the stack is defined by the --name flag of the cli

### job names

The name of the job is defined by:

```
<stackname>_<jobname>
```

A job name potentially points to multiple containers and this is how the load-balancing across containers works

### container names

Each time a container is run - a new pid is generated - this allows multiple copies of the same job

It also allows us to `docker ps` across the cluster and for the names to be distinct

The container name is:

```
<stackname>_<jobname>_<pid>
```

This will be set as the --name param for the container

### network names

The network will use:

```
<stackname>_<jobname>_<port>
```

And will ignore the pid - this lets us load balance by network / job / port namespacing




