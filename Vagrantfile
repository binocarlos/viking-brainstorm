# -*- mode: ruby -*-
# vi: set ft=ruby :

BOX_NAME = ENV['BOX_NAME'] || "precise64docker"
#BOX_URI = ENV['BOX_URI'] || "http://files.vagrantup.com/precise64.box"
BOX_URI = ENV['BOX_URI'] || "https://oss-binaries.phusionpassenger.com/vagrant/boxes/ubuntu-12.04.3-amd64-vbox.box"
PROJECTS_HOME = ENV['PROJECTS_HOME'] || "../"

Vagrant::Config.run do |config|
  config.vm.box = BOX_NAME
  config.vm.box_url = BOX_URI
  config.ssh.forward_agent = true
end

Vagrant::VERSION >= "1.1.0" and Vagrant.configure("2") do |config|

  (0..2).each do |i|
    config.vm.define "viking-#{i}" do |slave|
      slave.vm.network :private_network, ip: "192.168.8.12#{i}"

      $provision_script = <<PROVISION_SCRIPT
echo "Installing viking"
export VIKING_HOSTNAME="viking-#{i}"
export VIKING_NETWORK_PUBLIC="192.168.8.12#{i}"
export VIKING_NETWORK_PRIVATE="192.168.8.12#{i}"
cd /vagrant && make vagrant
echo "         _  _     _               "
echo " /\\   /\\(_)| | __(_) _ __    __ _ "
echo " \\ \\ / /| || |/ /| ||  _,\  / _,  |"
echo "  \\ V / | ||   < | || | | || (_| |"
echo "   \\_/  |_||_|\\_\\|_||_| |_| \\__, |"
echo "                            |___/ "
echo ""
PROVISION_SCRIPT

      if i == 0
        slave.vm.network :forwarded_port, guest: 443, host: 443
        slave.vm.synced_folder PROJECTS_HOME, "/srv/projects"
      end

      slave.vm.provider :virtualbox do |vb, override|
        slave.vm.network :forwarded_port, guest: 80, host: (8080 + i)
        override.vm.provision :shell, :inline => $provision_script
        vb.memory = 512
        vb.cpus = 1
        vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
        vb.customize ["modifyvm", :id, "--natdnsproxy1", "on"]
      end
    end
  end
end

Vagrant::VERSION < "1.1.0" and Vagrant::Config.run do |config|
  config.vm.provision :shell, :inline => $provision_script
end