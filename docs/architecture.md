# architecture

The viking scheduler is the core of the system in that it decides what docker containers run where.

The parts it is made of:

### intent

A record of what the jobs need running by user / stack and name.

### job list

The intent tree compiled into a list of jobs should be running.

Each job can be tagged ('db', 'eastcoast') - these tags can be matched agai

### server pool

The server pool is a list of machines - each machine has some tags and other meta data.

Each server also has a list of jobs it is currently running.

### Deployment

This is the record of what jobs are actually running where

### Monitor

This is where the monitor updates the deployment based on events / timeouts

## allocate loop
each viking master runs the allocate loop.

 * 1. check if the viking master is the etcd master
 * 2. compare the deployment and the job-list for new jobs
 * 3. loop jobs and choose a server from the server pool for each job
 * 4. run the job and add it to the deployment

if the viking master is not the etcd master - it ignores the loop.