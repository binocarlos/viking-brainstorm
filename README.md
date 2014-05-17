viking
======

Docker PaaS Platform for node.js applications.

The main objective of viking is to help you move westward and colonize server-farms with viking apps.

STATUS - PRE-ALPHA - do not try to use at the moment
                               
` /-\  //\ (-)  ~  ~  (-)  ~~~~     ~~~~ `
` \\-\//-/ |-| |-|/-/ |-| |----\   /----|`
`  \\-V-/  |-| |- -<  |-| |-|||-| |-(_|-|`
`   \\-/   |-| |-|\-\ |-| |-|||-|  \----|`
`                                   __|-|`
`                                  |---/ `

## installation

```
$ wget -qO- https://raw.github.com/binocarlos/viking/master/bootstrap.sh | sudo bash
```
## example viking file

This is an example stack that has 3 node.js workers - 1 one them with a volume and 2 services.

```yaml
# our viking is born
viking:
  name: ragnar
  comment: Ragnar Hamster Lothbrok

# must build boats before sail
# can use local boats in FROM statements using:
# FROM viking:<stackname>/<boatname>
build:
  src: |
    FROM quarry/monnode
    ADD . /srv/app
    RUN cd /srv/app && npm install
# images can inherit from other images in viking
# this image inherits from ragnar/src
  inherit: |
    FROM viking:ragnar/src
    RUN echo "setting" > /etc/mysetting

# our warrior viking formation
deploy:
  # the db viking - this is a node.js process that wraps a leveldb
  # we save the leveldb data into a volume so when we push new code - the data is still there
  db:
    # what boat this warrior will use
    image: viking:ragnar/src
    # expose docker ports - this automatically writes an endpoint to etcd for everything to see
    expose:
      - 80
    # allow persistent data - if a container has a volume it means it will be run on the same server each time
    volume:
      - /data/db
    # the command we run for this node
    run: mon node index.js --volume=/data/db
    # where the command is run
    cwd: /srv/app/db
  # a stateless service - this can be scaled and will run anywhere
  logic:
    # we use the same base codebase
    image: viking:ragnar/src
    # this means 2 processes will be run on different servers (if possible)
    scale: 2
    expose:
      - 80
    # and they have specific instructions
    run: mon node index.js
    cwd: /srv/app/logic
  # a HTTP serving process - this is stateless and will expose domains to the front router
  website:
    image: viking:ragnar/src
    scale: 3
    expose:
      - 80
    run: mon node index.js
    cwd: /srv/app/website
    # each domain is automapped to the front end HTTP router
    # this applies to each of the exposed ports in the image
    domains:
      - "thetracktube.com"
      - "www.thetracktube.com"
      - "tracktube.local.digger.io"
      - "tracktube.lan.digger.io"
  # a static website - this required no memory it will be virtuall hosted by the generic web server
  help:
    type: website
    # the document_root triggers static website mode
    document_root: ./help/www
    # static websites get hooked up to the front router too
    domains:
      - "help.thetracktube.com"
      - "*.help.thetracktube.com"
  # a service - these are fixed containers (with volumes) that are not restarted
  mongo:
    image: quarry/mongo
    # dont restart this process when we push code - multiple versions of code can use the same service this way
    service: true
    expose:
      - 27017
    volume:
      - /data/db
  redis:
    image: quarry/redis
    service: true
    expose:
      - 6379
    volume:
      - /data/db
```

## jobs

Here are the various jobs performed by files in /lib

### host
the process that runs on ALL viking servers (master or slave)

if the server is a master then host will react to a change in the etcd master and launch the leader on that server

### leader
this process runs on only one viking server - the master that is designated as etcd leader

the leader runs the dispatch, network, deployment, schedule and monitor modules

#### network
the network looks after the physical hosts we have on the network by managing a folder in etcd

#### deployment
the main database interface to the current state of the stack in terms of running processes

#### schedule
the interface to creating jobs - this will use the deployment to manage /proc

#### dispatch
this listens on /proc for new jobs and decides where on the network the job will run - the dispatch is what chooses where stuff runs

#### dowding
the main planner function - dowding knows what resources (servers) we have and the requirements for each process it will try to meet


#### monitor
monitors all running services and keeps /ports up to date with current endpoints

### slave
runs on each viking slave - listens to /deploy/<hostname>

## config
load the config from /etc/viking and env

## builder
loop over a viking file and build images and commit them to the registry

## stack
represent a single stack with its source directory

## vikingfile
process the YAML file that describes a stack

## volume
simple api to a docker volume

## state
load the current state of the whole stack

## server
represent a single server

## process
wrap a running process with mon

## job
represent a single process to be run

## imagebank
keep a log of images uploaded to the registry

## hostmonitor
running on every viking host - update /host/<hostname>

## endpoints
load the network information for running processes

## dockerrun
wrap a docker run statement

## container
wrap a docker container


## deploy job

The flow for the keys when deploying a job:

 1. write the job to /proc from anywhere (via schedule module)
 2. dispatch is listening to /proc
 3. dowding choose which server from /host
 4. dowding use /fixed to keep services locked onto one server
 5. deployment runJob which writes to 
   * /run/<stack>/<node>/<tag> = <hostname>
   * /deploy/<hostname>/<stack>/<node>/<tag> = ''
 6. slave which is listening to /deploy/<hostname>
 7. use /count (via deployment) for sanity check against failing containers
 8. write /deploy/<hostname>/<stack>/<node>/<tag> = container_name
 9. write /ports/<stack>/<node>/<port>/<proto>/<ip>/<hostPort>/<jobId>

## etcd keys

The database for the stack is distributed using [etcd](https://github.com/coreos/etcd).

The keys are:

 * /image/<stack>/<node>/<tag> - the images we have uploaded to the local registry
 * /host/<hostname> - a list of the servers currently on our network
 * /proc/<stack>/<node>/<tag> - the list of processes to run
 * /run/<stack>/<node>/<tag> = <hostname> - allocation table
 * /deploy/<hostname>/<stack>/<node>/<tag> = <containerName> - deployment table
 * /counter/<hostname>/<stack>/<node>/<tag> - failed run table
 * /ports/<stack>/<node>/<port>/<proto>/<ip>/<hostPort>/<jobId> - network
 * /images/<stack>/<node>/<tag> - images uploaded to the registry

## license

MIT