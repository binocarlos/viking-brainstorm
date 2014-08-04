# v2 cli vs http

having a brain argument between:

 * viking as a command line application using trig - HTTP triggers cli
 * viking as a HTTP api - cli triggers HTTP

## cli

the cli approach is nice because very easy to slot in different modules for different tasks.

e.g.

`listhosts`

this step requires a JSON array of host descriptors

this can be produced by:

```
$ cat servers.json
```

or:

```
$ docker run --rm my/image loadservers
```

however - it will be slow and hard to activate via HTTP

## http

the http approach is less configurable but easier to slot in and work with

the advantage of HTTP is it can be a proxy for the normal docker client

## both

really - we need both, the question is where the logic is loaded from:

 * as static code loaded into the HTTP api
 * as dynamic cli modules invoked through the HTTP api

## cli

This would need a way for the HTTP server to run cli programs:

 * run the HTTP api process on the docker host

## http

This would need a way to change the behaviour of the different triggers easily without a massive config tree.


# solution

write an opinionated stack without the bash approach of plug and play

why? because having to run unknown code in unknown contexts is a massive weakness

Also - I need a fucking holiday, the HTTP api will be awesome and because.

## etcd / consul

Ok - a middle ground can be an eventual behaviour configuration by using etcd/consul equally and by listening for key changes to change behaviour