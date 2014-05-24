# viking network

The control of the network is handled by a single master.

The master is choosen using etcd leader election.

The choosen master becomes the viking 'leader'.

Every viking host is running a 'slave'.


## etcd

There is an etcd server running on each master.



