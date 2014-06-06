# manually booting viking cluster leader

this steps through running a viking cluster without running the host deamon

## stop etcd

```
$ viking etcd stop
```

## reset etcd

```
$ sudo viking etcd reset
```

## boot etcd

```
$ viking etcd start --seed
```

## run a host to register a server

```
$ viking host
```

then open another command line

## deploy the core stack

```
$ viking deploy core
```




## dispatch

```
$ viking dispatch
```

## run slave

```
$ viking slave
``