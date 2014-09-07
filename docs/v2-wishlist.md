# plan

OK - so golang is the language that viking should be written in.

Reasons:

 * memory consumption of node.js
 * access to docker & libswarm git hub libraries
 * integration with docker community

Consul is the service discovery mechanism it should use.

Reasons:

 * multi-data center
 * DNS discovery for core services is very useful (especially for UDP routing)


Step 1:

 * plugin consul
 * rewrite node.js etcd libs

Step 2:

 * write flocker in golang - base it on libswarm / docker server & rename