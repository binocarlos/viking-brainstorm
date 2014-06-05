# feature requests

things that would be good to plug in:

## hooks

pipe JSON through any script with a description of the event on the command line

do this for key events like:

 * allocate server for job
 * create job from stack

## commands

the stack should define commands as well as nodes

commands can then be run as one offs

they can also be referenced to generate a job description

## process stdout into metric events

a module could listen to the stdout of running jobs for specially formatted lines which would write to statsd or some such service

this enables metrics in apps easily (by writing to stdout)