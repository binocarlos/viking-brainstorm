VIKING_ROOT ?= /srv/viking
SSHCOMMAND_URL ?= https://raw.github.com/progrium/sshcommand/master/sshcommand
VPC_URL ?= https://raw.github.com/binocarlos/vpc/master/bootstrap.sh
NAVE_URL ?= https://raw.github.com/isaacs/nave/master/nave.sh
NODE_VERSION ?= 0.10.26

.PHONY: install dependencies basics sshcommand docker aufs nodejs network links developer recentgit vagrant supervisor

install: dependencies setup

setup:
	usermod -aG docker viking
	usermod -aG sudo viking
	mkdir -p /var/run/viking
	mkdir -p /var/log/viking
	mkdir -p /var/lib/viking
	chown -R viking:viking /var/lib/viking
	chown -R viking:viking /var/run/viking
	chown -R viking:viking /var/log/viking
	chmod -R g+w /var/lib/viking
	chmod -R g+w /var/run/viking
	chmod -R g+w /var/log/viking
	mkdir -p /var/lib/viking/volumes
	mkdir -p /etc/viking/supervisor

vagrant: install
	usermod -aG docker vagrant
	usermod -aG viking vagrant
	./vagrant/admin init

dependencies: basics sshcommand supervisor docker vpc nodejs etcd

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

etcd:
	curl -L https://github.com/coreos/etcd/releases/download/v0.4.1/etcd-v0.4.1-linux-amd64.tar.gz -o /tmp/etcd-v0.4.1-linux-amd64.tar.gz
	cd /tmp && gzip -dc etcd-v0.4.1-linux-amd64.tar.gz | tar -xof -
	cp -f /tmp/etcd-v0.4.1-linux-amd64/etcdctl /usr/local/bin
	cp -f /tmp/etcd-v0.4.1-linux-amd64/etcd /usr/local/bin
	rm -rf /tmp/etcd-v0.4.1-linux-amd64.tar.gz

supervisor:
	apt-get install python-setuptools
	easy_install supervisor
	cp ./files/supervisor/supervisord.conf /etc/supervisord.conf
	cp ./files/supervisor/init.sh /etc/init.d/supervisord
	chmod a+x /etc/init.d/supervisord
	#update-rc.d supervisord defaults
	#service supervisord start

token:
	@curl https://discovery.etcd.io/new
	@echo

clean:
	./vagrant/admin ssh sudo viking reset 

#links:
#	rm -f /usr/local/bin/viking
#	ln -s $(CURDIR)/viking /usr/local/bin/viking

#recentgit:
#	add-apt-repository ppa:voronov84/andreyv -y
#	apt-get update
#	apt-get install -y git

#developer: recentgit links
#  ./vagrant/installphantom