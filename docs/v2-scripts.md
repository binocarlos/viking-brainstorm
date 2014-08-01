## scripts

viking has a modular design that can trigger custom scripts to respond to events and produce data.

For example - you might manage your infrastructure manually or use an orchestration tool like [terraform](http://http://www.terraform.io/).

It is up to you to define the bash/docker job that will produce a list of infrastructure.

This can be as simple as:

```bash
cat servers.json
```

Or you could load the servers from a key in etcd server:

```bash
docker run --rm binocarlos/viking-etcd-servers --etcd $VIKING_ETCD --key /servers
```

### triggers

triggers is how you specify which scripts are run for what events.

viking has a default set of scripts to perform each job - if you don't provide an override, it will use the default version.

#### trigger files
you can control the behaviour of your viking installation by replacing the default trigger scripts

```yaml
server-list: cat ./servers.json
```

The above would replace the default viking server-list script (which prints localhost) by dumping the contents of servers.json

You can provide a list of scripts - the output of the first will be used in the pipe chain but each script will be run with the input from the last step:

```yaml
server-add:
	- ./addserver.sh $@
	- echo "$@" >> /tmp/serverlog.txt
```

If you want to augment the default behaviour - you can place a pipe symbol at either end of the (first) command:

```yaml
server-list: | filterhosts.sh
```

The above will pipe the default viking output through the filterhosts script.

#### save trigger config

Our directory layout would be:

 * /
 * /triggers.yaml
 * /servers.json
 * /addserver.sh
 * /filterhosts.sh
 * /shared.sh

To save these triggers across the cluster:

```bash
$ viking triggers save --folder /my/triggers
```

#### trigger execution context

The triggers are run on the top-level command line of the viking master that is executing the current task

Trigger commands can be to run docker jobs

### variables

viking trigger commands have access to the command line arguments passed to the original command - use $@

### envrionment

viking scripts all have access to the following environment variables:

 * VIKING_ETCD - connection address to the etcd cluster

### events

here is a list of the events that can trigger a viking script

you can configure a different script to react to each event name

#### server-list

get a JSON array of the current inventory of servers

#### server-add

add servers to the cluster

#### server-tag

set the tags for a server

#### server-remove

remove servers to the cluster

#### image-build

build docker images from a stacks source code

#### image-push

push docker images to a docker registry or remote HTTP service

#### image-pull

pull docker images from a docker registry or remote HTTP service

#### stack-status

load the deployed status of a stack

#### stack-plan

generate the planned actions for pushing a stack

this can involve spinning down the old stack

#### job-status

load the deployed status of a job

#### job-filter

INPUT: output of server-list
ARGS: job specific properties for filtering the server

filter the input array of servers based on the job properties

#### job-allocate

INPUT: output of job-filter
ARGS: job specific properties for choosing the server

choose one of the input servers to actually run the job