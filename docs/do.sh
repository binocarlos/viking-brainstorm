#!/bin/bash
# Be Sure To Change This!
Client_Key=A2a9SfT4NeFBl6df5cu42
API_Key=mnqWGdu4OfLBwwJPee6cpjkeY70qv9mKicqZYvtHJ

droplets()
{
echo "Your current droplets:"
All_Droplets=`curl -s "https://api.digitalocean.com/droplets/?client_id=$Client_Key&api_key=$API_Key"`
echo $All_Droplets | sed -e 's/,/\n/g' | sed -e 's/{/\n/g' | sed -e 's/}/\n/g' | sed -e 's/"//g'
}

spinup()
{
Droplet_Name=$1
Size_ID=$2
Image_ID=$3
Region_ID=$4
echo "Spinning up a new droplet $Droplet_Name"
curl -s "https://api.digitalocean.com/droplets/new?name=$Droplet_Name&size_id=$Size_ID&image_id=$Image_ID®ion_id=$Region_ID&client_id=$Client_Key&api_key=$API_Key"
}

resize()
{
Droplet_ID=$1
Size_ID=$2
echo "Resizing a droplet ID: $Droplet_ID to Size ID: $2"
curl -s "https://api.digitalocean.com/droplets/$Droplet_ID/resize/?size_id=$Size_ID&client_id=$Client_Key&api_key=$API_Key"
}

sizes()
{
sizes=`curl -s "https://api.digitalocean.com/sizes/?client_id=$Client_Key&api_key=$API_Key"`
echo $sizes | sed -e 's/,/\n/g' | sed -e 's/{//g' | sed -e 's/}//g' | sed -e 's/"//g' | sed -e 's/\[/\n/g'
}

snapshot()
{
Droplet_ID=$1
Snapshot_Name=$2
echo "Taking a snapshot of Droplet $1 with Name: $Snapshot_Name"
curl -s "https://api.digitalocean.com/droplets/$Droplet_ID/snapshot/?name=$Snapshot_Name&client_id=$Client_Key&api_key=$API_Key"
}


go()
{
# Display all current droplets.  Region_ID: 1 for US, 2 for Amsterdam.
droplets

# Show possible Size IDs, for RAM, also tied to amount of CPU cores and HDD allocated - refer to https://www.digitalocean.com/pricing
echo "Possible droplets sizes by RAM:"
sizes

# Take a snapshot of an existing droplet
# The syntax is: snapshot Droplet_ID Snapshot_Name
# For example to take a snapshot of droplet with ID "72100":
#snapshot 72100 domain.com

# Vertical Scaling - Increase RAM, CPU, Disk
# The syntax is: resize Droplet_ID New_Size_ID
# For example to resize a 512MB droplet to a 1GB droplet with ID "72100":
#resize 72100 63

# Horizontal Scaling - Clone a server from a snapshot
# The syntax is: spinup Droplet_Name Size_ID Image_ID Region_ID
# For example, to spinup a 512MB clone of domain.com webserver with image ID "12573" in New York datacenter (Region 1):
#spinup domain.com 66 12574 1
}

go