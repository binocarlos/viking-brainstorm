# modules

once the mesh + etcd + ssh network has been setup - pushing and running processes should be left to plugins

a plugin is a stack that is running and has access to the viking api

for example - the git push deploy is a plugin not part of the core

the core is:

 * etcd hookup (either running server or provided with endpoint of servers)
 * viking-host (server process running active viking code)
 * viking-slave (can run jobs based on etcd entries)

the main library functions of the core:

 * leader election (designate one server to play the role of X but with auto-failover)
 * scheduler (always running to decide where to run new jobs based on etcd keys)
 * deploy (viking-slave listens to this to run jobs on servers)

## smesh

background process that writes a ttl key to etcd

also handles leader elections and triggering code on leader change

## dowding

the work allocation module - input state - make decision and alter state - return state

you provide rules for allocating work

## tugboat

a stream based docker api

## vason

a viking mason - turn src folders with viking.yaml into docker images and push them



