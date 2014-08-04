# v2 environment

the variables present in each viking host:

 * HOSTNAME - the hostname of the machine (localhost)
 * VIKING_IP - the IP to publish for this host (usually eth1 for private network)
 * VIKING_ETCD - comma seperated etcd string (192.168.8.120:4001,192.168.8.121:4001)
 * VIKING_TAGS - comma seperated list of tags for this server
 * VIKING_KEY - the base key in which we will save our state to etcd | consul