# wait after container start

once container is started on slave - wait a small time and then check that it is actually running before writing the log with the status

# do the scale once a single version of each job has been deployed

the first batch is database servers

the second is a single version of each job

the last are the scaled versions of each job

this lets us detect failed jobs before deployed a whole bunch of doomed jobs