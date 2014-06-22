VIKING_ROOT ?= /srv/viking
SSHCOMMAND_URL ?= https://raw.github.com/progrium/sshcommand/master/sshcommand
VPC_URL ?= https://raw.github.com/binocarlos/vpc/master/bootstrap.sh
NAVE_URL ?= https://raw.github.com/isaacs/nave/master/nave.sh
NODE_VERSION ?= 0.10.26

.PHONY: install dependencies basics sshcommand docker aufs nodejs network links developer recentgit vagrant

install: dependencies setup

setup:
	usermod -aG docker viking
	usermod -aG sudo viking
	mkdir -p /var/log/viking
	mkdir -p /var/lib/viking
	chown -R viking:viking /var/lib/viking	
	chown -R viking:viking /var/log/viking
	chmod -R g+w /var/lib/viking
	chmod -R g+w /var/log/viking
	mkdir -p /var/lib/viking/volumes

vagrant: install
	usermod -aG docker vagrant
	usermod -aG viking vagrant
	./vagrant/admin init

dependencies: basics sshcommand mon docker vpc nodejs etcd

basics:
	apt-get update
	apt-get install -y git curl software-properties-common python-software-properties python g++

sshcommand:
	wget -qO /usr/local/bin/sshcommand ${SSHCOMMAND_URL}
	chmod +x /usr/local/bin/sshcommand
	sshcommand create viking /usr/local/bin/viking

docker: aufs
	egrep -i "^docker" /etc/group || groupadd docker
	curl https://get.docker.io/gpg | apt-key add -
	echo deb http://get.docker.io/ubuntu docker main > /etc/apt/sources.list.d/docker.list
	apt-get update
	apt-get install -y lxc-docker
	sleep 2 # give docker a moment i guess

latestdocker: docker
	cd ~/ && git clone https://git@github.com/dotcloud/docker
	cd ~/docker && sudo make build
	cd ~/docker && sudo make binary
	sudo service docker stop ; sudo cp $(which docker) $(which docker)_ ; sudo cp ~/docker/bundles/0.11.1-dev/binary/docker-0.11.1-dev $(which docker);sudo service docker start


mon: nodejs
	(mkdir /tmp/mon && cd /tmp/mon && curl -L# https://github.com/visionmedia/mon/archive/master.tar.gz | tar zx --strip 1 && make install && rm -rf /tmp/mon)
	npm install -g mongroup

aufs:
	lsmod | grep aufs || modprobe aufs || apt-get install -y linux-image-extra-`uname -r`

network:
	sysctl -w net.ipv4.ip_forward=1

vpc: network
	wget -qO- ${VPC_URL} | sudo bash
	sleep 1
	service docker restart
	sleep 1

nodejs:
	wget -qO /usr/local/bin/nave ${NAVE_URL}
	chmod a+x /usr/local/bin/nave
	nave usemain ${NODE_VERSION}

etcdctl:
	curl -L https://github.com/coreos/etcd/releases/download/v0.4.1/etcd-v0.4.1-linux-amd64.tar.gz -o /tmp/etcd-v0.4.1-linux-amd64.tar.gz
	cd /tmp && gzip -dc etcd-v0.4.1-linux-amd64.tar.gz | tar -xof -
	cp -f /tmp/etcd-v0.4.1-linux-amd64/etcdctl /usr/local/bin
	#cp -f /tmp/etcd-v0.4.1-linux-amd64/etcd /usr/local/bin
	rm -rf /tmp/etcd-v0.4.1-linux-amd64.tar.gz

token:
	@curl https://discovery.etcd.io/new
	@echo

clean:
	viking host stop --clean
	viking etcd stop
	sudo viking etcd reset
	docker rmi $(docker images | grep "^<none>" | awk "{print $3}")

#links:
#	rm -f /usr/local/bin/viking
#	ln -s $(CURDIR)/viking /usr/local/bin/viking

#recentgit:
#	add-apt-repository ppa:voronov84/andreyv -y
#	apt-get update
#	apt-get install -y git

#developer: recentgit links
#  ./vagrant/installphantom