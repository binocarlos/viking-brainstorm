# v2 network

how containers talk to each other across different hosts.

## stack layout

each stack is given a name - this can be overriden from the command line

stacks have named jobs/services inside them

workers from one stack can communicate with workers from another stack

the stack file should mention the dependency

for example - I have a 'shared database' stack:

```yaml
mongo:
	image: quarry/mongo
	expose:
		- 27017
	volume:
		- /db/data
auth:
	image: binocarlos/gandalf
	expose: 80
	volume: /db/data
```

And then a simple webapp stack:

```yaml
middleware:
	image: myapp/web
	expose: 80
	link:
		- shared/mongo
		- shared/auth
web:
	image: myapp/web
	expose: 80
	link:
		- shared/mongo
		- shared/auth
		- middleware
```

## deployment config

Once a stack has been processed - each job will be copied out into the deployment config folder

This lets you hook into the deployment by hand - i.e. by manually adding jobs to the deployment config folder

The folder structure is:

 * /
 * /<stackname>
 * /<stackname>/<containername>.(json|yaml)

Each job file is named after the top level key and contains a JSON or YAML file describing the job

This can include the 'scale' property - a single job file could spawn 100 containers across the cluster

## job names

The stackname is defined when the stack is deployed (e.g. viking deploy . --name mystack)

The `<service-name>` variable is defined by `<stackname>_<jobname>`

Every actual job gets a pid - this can also be used to distinquish multiple copies of the same job

Slashes are replaced e.g. our link to `shared/mongo` in the web container is turned into `shared_mongo` as a link name

This would result in the standard docker environment variables appearing in the container as though the containers were all on the same host:

 * SHARED_MONGO_PORT (tcp://127.0.0.1:8934)
 * SHARED_MONGO_PORT_27017_TCP (tcp://127.0.0.1:8934) - this omits tcp because it is inferred by the name
 * SHARED_MONGO_PORT_27017_TCP_PROTO (tcp)
 * SHARED_MONGO_PORT_27017_TCP_PORT (8934)
 * SHARED_MONGO_PORT_27017_TCP_ADDR (127.0.0.1)

Using these to connect to a service:

```js
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

var address = 'http://' + process.env.SHARED_MONGO_PORT_27017_ADDR + ':' + process.env.SHARED_MONGO_PORT_27017_PORT + '/v1/thing'
hyperquest(address).pipe(concat(function(answer){
	// connected
}))
```

If the service is defined in the same stack - the environment is named without the stackname (i.e. just the jobname)

For example - the reference to the `middleware` job from the `web` job would yield the following environment:

 * MIDDLEWARE_PORT_80
 * MIDDLEWARE_PORT_80_*

## ambassador

ambassadord is running on each server publishing on the private network address

it proxies requests from containers to other registered services on the network

every container that has a link is actually linked to the ambassador running on the same host

the port used to connect is where it gets funky

#### stack ports

One stack might have an 'auth' service that listens on HTTP on port 80

Other jobs will want to connect to this job using something like:

```
curl http://$AUTH_PORT_80
```

To make this work with ambassador - we need to pick a different port to the standard port 80.

This is because other nodes running on the same server might require port 80 also.

So - the environment is setup with a different - viking allocated PORT number that overrides the normal ambassador behaviour so that different jobs can have the same logical port.

Here is how an ambassadord job is hooked up:

```
$ docker run -d --link backends:backends -e "BACKEND_6379=redis.services.consul" progrium/mycontainer startdaemon
```

So anything on port 6379 to the ambassador will resolve to the redis service.

The problem is as we are deploying multiple stacks and dont want to get into segregation of jobs - there is likely to be multiple redis services appearing on the network

We need a way to distinquish redisA and redisB - both of which would normally be accessed via port 6379

#### port allocator

We need to control the allocation of ports on the ambassador and keep these ports unique per backend service per host.

The solution is to use the etcd-increment module (which atomically increments a counter)

Each time a new job that is linked to is discovered - a new ambassador port is created using the atomic increment.

It is this port that is:

 * published to ambassadord as the target port for the service
 * injected into the environment of the linked container

From the connecting containers perspective - everything works as though you are linking locally:

```js
var hyperquest = require('hyperquest')

var address = 'http://' + process.env.AUTH_PORT_80_TCP_ADDRESS + ':' + process.env.AUTH_PORT_80_TCP_ADDRESS
```

There needs to be a viking step called: `allocate_port`

This will accept the name of a service (stack/job) and return a new or previously recorded port for that service

#### prepare the service

The service container will be run first because the viking scheduler will realise it is linked too.

For a mystack/mongo service - we notice that port 27017 is exposed and so create a new port mapping for port 27017

This might return 1432 as our port and this is saved so if the same service is restarted elsewhere - we are still using 1432 for mystack/mongo:

#### run the service

The service will publish its exposed ports to the etcd path `/viking/network`

It triggers registrator to do this by using the SERVICE_<PORT> syntax

ISSUE - we need to know the exposed ports of a container (so a pure dockerfile approach is tricky)

```bash
$ docker run -d --name mystack_mongo.e8c8a2 -p 27017 \
    -e "SERVICE_27017_NAME=mystack_mongo_27017" \
    -e "SERVICE_27017_ID=mystack_mongo_27017_a6df32" \
    mystack/mongo
```

#### run the linked container

we notice the webapp has a link to mongo - a service in the same stack - the stackname is 'mystack' - the webapp is in the same stack:

the original job:

```bash
$ docker run -d --name app_web_ba6d82 -p 80 \
		--link mystack_mongo mystack/webapp
```

The link `mystack_mongo` indicates that we want to hook up ambassadord

We will create a link for each port exposed

This is processed into:

```bash
$ MYSTACK_MONGO_27017=`viking allocateport mystack/mongo`
$ VIKING_ETCD_HOST=`viking etcdhost`
$ VIKING_ETCD_HOSTS=`viking etcdhosts`
$ docker run -d --name app_web_ba6d82 -p 80 \
		--link backends:backends \
		-e "BACKEND_$MYSTACK_MONGO_27017=etcd://$VIKING_ETCD_HOST/viking/network/mystack_mongo_27017" \
		-e "MYSTACK_MONGO_PORT=tcp://backends:$MYSTACK_MONGO_27017" \
		-e "MYSTACK_MONGO_PORT_27017_TCP=tcp://backends:$MYSTACK_MONGO_27017" \
		-e "MYSTACK_MONGO_PORT_27017_TCP_PROTO=tcp \
		-e "MYSTACK_MONGO_PORT_27017_TCP_PORT=$MYSTACK_MONGO_27017" \
		-e "MYSTACK_MONGO_PORT_27017_TCP_ADDR=backends" \
    -e "SERVICE_80_NAME=app_web_80" \
    -e "SERVICE_80_ID=app_web_80_ba6d82" \
    mystack/webapp
```

## registrator

registrator is what will automatically register endpoints with etcd.

start:

```bash
$ docker run -d \
    -v /var/run/docker.sock:/tmp/docker.sock \
    -h $HOSTNAME progrium/registrator -ip=$VIKING_IP etcd://$VIKING_ETCD_HOST/viking/network
```

## ambassadord

our reverse tcp proxy for routing to end points above:

```bash
$ docker run -d -v /var/run/docker.sock:/var/run/docker.sock --name backends progrium/ambassadord --omnimode
$ docker run --rm --privileged --net container:backends progrium/ambassadord --setup-iptables
```

## vpc

vpc protects viking machines from outside connections and non-cluster machines on the private network.
