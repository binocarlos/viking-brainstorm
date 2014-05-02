viking
======

Docker PaaS Platform for node.js applications.

The main objective of viking is to help you move westward and colonize server-farms with viking apps.

STATUS - PRE-ALPHA - do not try to use at the moment

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
## example viking file

This is an example stack that has 3 node.js workers - 1 one them with a volume and 2 services.

```yaml
# the viking object configures the stack itself
viking:
  # the name of the stack is used for container names - teststack/website in this case
  name: teststack
  # the very first viking to sail West!
  comment: Ragnar Lothbrok

# containers are built from your source code and pushed to a private docker registry
# you can use local containers in FROM statements by using:
# FROM viking:<stackname>/<nodename>
container:
  # the base container - the other nodes will extend from this
  base: |
    FROM quarry/monnode
    ADD . /srv/app
    RUN cd /srv/app && npm install
  db: |
    FROM viking:teststack/base
    EXPOSE 5000
    VOLUME /var/db
    WORKDIR /srv/app/db
    ENTRYPOINT mon node index.js
  logic: |
    FROM viking:teststack/base
    EXPOSE 5001
    WORKDIR /srv/app/logic
    ENTRYPOINT mon node index.js
  website: |
    FROM viking:teststack/base
    EXPOSE 80
    WORKDIR /srv/app/website
    ENTRYPOINT mon node index.js

# workers are processes that we are deploying
# each worker has an ideal 'scale' that is the minimum number of workers
proc:
  db:
    # the container 
    container: viking:teststack/db
    # static means there will be only one and it will be launched on the same server each time
    # if the dockerfile has volumes then static is automatically true
    static: true
  logic:
    container: viking:teststack/base
    run: node logic/index.js
    scale: 2
  website:
    container: viking:teststack/base
    run: node website/index.js
    scale: 2
    route:
      - "thetracktube.com"
      - "www.thetracktube.com"
      - "tracktube.local.digger.io"
      - "tracktube.lan.digger.io"

# services - these are persistent (like databases) and are not restarted on each push
# the connection data for services is written to etcd and to the environment of each container
service:
  mongo:
    # the service can be from any docker container
    container: quarry/mongo
    # services normally save data that we want in a volume
    volumes:
      - /data/db
    # ports exposed by services are published to etcd and are injected into the environment of workers
    expose:
      - 27017
  # you can run as many services as you want in a single stack
  redis:
    type: service
    container: quarry/redis
    volumes:
      - /data/db
    expose:
      - 6379

# static websites dont consume memory - they are all routed to the generic HTTP server
static:
  help:
    document_root: help/www
    route:
      - "help.thetracktube.com"
      - "*.help.thetracktube.com"
```

## license

MIT