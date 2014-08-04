# v2 docker

viking has a [libswarm](https://github.com/docker/libswarm) backend

this proxies libswarm verbs onto the backend HTTP api

Because viking adheres to docker links properly - you can easily switch development and viking backends for testing

the viking cli also proxies onto the HTTP api

## backend dockers

the HTTP api is a clone of the docker HTTP api

there are the following additions:

 * /v1/host - get a list of machines in the swarm
 * /v1/stack - get info about deployed stacks

## 

```bash
$ docker run -H http://192.168.8.120:2456 -d --name app_web_ba6d82 -p 80 \
		--link backends:backends \
		-e "VIKING_TAG=web" \
		mystack/webapp
```

The VIKING_TAG applies a server filter to the server_list

```bash
$ docker run -H http://192.168.8.120:2456 -d --name app_web_ba6d82 -p 80 \
		--link backends:backends \
		-e "VIKING_HOST=node3" \
		mystack/webapp
```

The VIKING_HOST applies a single filter to the server_list

