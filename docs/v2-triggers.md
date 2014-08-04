## v2 triggers

a list of the different triggers in viking

### help

show the help documents for the cli

### ps <hostname> --json

list the containers running across a single or all hosts

### hosts --json

list the hosts on our network

can accept flags to filter the list

 * tag - filter the hosts by a registered tag
 * name - filter the hosts by hostname

each host must have the following properties:

 * name - the hostname
 * docker - the docker endpoint for the host
 * tags - a list of tags for the host

### allocate

save/retrive a mapped port to use for ambassadord port allocation

### job

filter a job that will run on a docker host
