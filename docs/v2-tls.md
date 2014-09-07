# tls

Objective: secure a consul cluster.

secure the consul gossip with TLS / sync key

expose the consul HTTP only on docker network

link all containers to consul container so they can talk to consul without TLS

run consul HTTP proxy container that is a TLS layer for external host communication to consul (i.e. from viking master)

secure docker with TLS

now - you can run consul & docker on public IP

only clients with the TLS config can speak to those nodes