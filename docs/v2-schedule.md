# v2 schedule

This will be configured as an external container

the schedule is a record of what the user intends to run on the cluster

It is basically a list of containers that have been routed and launched

docker stop / rm commands will remove the containers from the schedule.

Container data in the schedule is 'pre-routing' stage - i.e. the data is the original request recieved from the user

This allows us to re-route containers that have failed by re-running the container create step.

the schedule will be written to etcd as a list of container-names against /create data posted

