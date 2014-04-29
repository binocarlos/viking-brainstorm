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
	mkdir -p /etc/viking
	mkdir -p /var/lib/viking
	chown viking:viking /var/lib/viking
	chmod g+w /var/lib/viking

vagrant: install vagrantsetup

vagrantsetup: vagrantgroups vagrantinit

vagrantgroups:
	usermod -aG docker vagrant
	usermod -aG viking vagrant

vagrantinit:
	./vagrant/admin init

dependencies: basics sshcommand docker vpc nodejs mon

basics:
	apt-get update
	apt-get install -y git curl software-properties-common python-software-properties python g++

sshcommand:
	wget -qO /usr/local/bin/sshcommand ${SSHCOMMAND_URL}
	chmod +x /usr/local/bin/sshcommand
	sshcommand create viking /usr/local/bin/viking

mon:
	(mkdir /tmp/mon && cd /tmp/mon && curl -L# https://github.com/visionmedia/mon/archive/master.tar.gz | tar zx --strip 1 && make install)
	(mkdir /tmp/mongroup && cd /tmp/mongroup && curl -L# https://github.com/jgallen23/mongroup/archive/master.tar.gz | tar zx --strip 1 && make install)
	rm -rf /tmp/mon
	rm -rf /tmp/mongroup

docker: aufs
	egrep -i "^docker" /etc/group || groupadd docker
	curl https://get.docker.io/gpg | apt-key add -
	echo deb http://get.docker.io/ubuntu docker main > /etc/apt/sources.list.d/docker.list
	apt-get update
	apt-get install -y lxc-docker 
	sleep 2 # give docker a moment i guess

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

token:
	@curl https://discovery.etcd.io/new
	@echo

#links:
#	rm -f /usr/local/bin/viking
#	ln -s $(CURDIR)/viking /usr/local/bin/viking

#recentgit:
#	add-apt-repository ppa:voronov84/andreyv -y
#	apt-get update
#	apt-get install -y git

#developer: recentgit links
#  ./vagrant/installphantom