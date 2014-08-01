## run container

the steps to run a container:

### 1. get inventory

we need a list of servers that we can run the job on

```bash
cat servers.json
```

```json
[{
	"hostname":"node1",
	"public":"192.168.8.120",
	"private":"192.168.8.120",
	"docker":"192.168.8.120:2375",
	"tags":[
		"server",
		"db"
	]
},{
	"hostname":"node2",
	"public":"192.168.8.121",
	"private":"192.168.8.121",
	"docker":"192.168.8.121:2375",
	"tags":[
		"server",
		"web"
	]
}]
```

### 2. get job status

we need to know the current/last known status of a job so we can sort out fixed allocations

```bash
load-stack-history <job-id>
```

### 3. load server summary

get a list of the jobs currently running on each server

### 4. filter inventory

combine inventory with list of jobs and filter servers that cannot be used

### 5. choose least busy

choose the least busy server from the remaining list

#### 6. run job

trigger the job running on the remote server