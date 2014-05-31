# model

the data we need to know about

 * /image/stack/tag/node - the images we have uploaded to the local registry
 * /host/hostname - a list of the servers currently on our network
 * /proc/stack/tag/node - the list of processes to run
 * /run/stack/tag/node = hostname - allocation table
 * /deploy/hostname/stack/tag/node = <containerName> - deployment table
 * /counter/hostname/stack/tag/node - failed run table
 * /ports/stack/tag/node/port/proto/ip/hostPort/jobId - network
 * /images/stack/tag/node - images uploaded to the registry



## proc

this deals with writing state to the cluster and is the main way in which client programs interact with viking



you request job


## getState(etcd, done)

return an object with:

 * /proc - the desired processed (jobs to do)
 * /run - the current allocations (servers choosen)
 * /deploy - the current deployments (jobs running)


## 