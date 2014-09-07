# v2 health

this will be configured as an external container

there are 2 types of health checking:

 * host
 * container

Host health checking is done automatically for any server in `/inventory`

It is done by performing a ping to the docker server

Container health checking is done by checking the `VIKING_HEALTH` or `VIKING_HEALTH_<port>` env

This can be the following values:

 * tcp
 * http

If the port is omitted - it will apply the check to all exposed ports for the container

A tcp check is basically a telnet

A HTTP check is a 200 from GET /

## failing checks

If either a host or a container check fails - then the schedule is diffed against the current cluster state and the results are re-created.

If a host has failed then all logs with that host value must be removed to prevent volume based routing sending the container to a dead server