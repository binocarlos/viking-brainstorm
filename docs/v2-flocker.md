# v2 flocker

when containers are launched onto viking they go via the flocker proxy

this is able to remap container config and is given the image data also

## routing

Rules for routing containers:

 * look at the container env to see if there is a VIKING_TAGS value
 * look at the container env to see if there is a VIKING_SERVER value
 * remove servers that are full/reserved etc
 * pick the server from the list with the least number of containers

## mapping

Rules for mapping container data:

 * loop over all exposed ports (container & image) and run port envs (below) 
 * if volume then find its previous location and fix to there
 * if volume_from then find source container location and fix to there
 * check volume and volume_from (multiple) for differences

## listing

We load everything from `/inventory` - these are the active servers

## naming

To allow multiple copies of the same container to be treated as a group, the container names should follow this format:

```
<jobname>.<pid>
appserver.3453
```

The `SERVICE_ID` is set to `appserver.3453`

The `SERVICE_NAME` is set to `appserver`

## saving routes

We need to save the location of named containers so we can look up volume / volume_from routes

## --links

When a container is linked - the name that is used can either represent a single container or a group

```
$ docker run --name myapp.1 --link auth binocarlos/myapp
$ docker run --name myapp.2 --link auth binocarlos/myapp
```

In this case - we would link to `SERVICE_NAME=auth`

If the auth service were run like this:

```
$ docker run --name auth.1 binocarlos/myauth
$ docker run --name auth.2 binocarlos/myauth
```

The 2 copies of myapp can communicate with the 2 copies of auth using the env:

```
AUTH_PORT
AUTH_PORT_80_TCP
AUTH_PORT_80_TCP_PROTO
AUTH_PORT_80_TCP_PORT
AUTH_PORT_80_TCP_ADDR
```

Port 80 was defined in the Dockerfile and so the user did not need to -p 80 for the auth server

This is possible because we load the image definition before creating the container




