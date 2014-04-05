#!/usr/bin/env bash
set -eo pipefail
export DEBIAN_FRONTEND=noninteractive
export VIKING_REPO=${VIKING_REPO:-"https://github.com/binocarlos/viking.git"}
export VIKING_BRANCH=${VIKING_BRANCH:-"master"}
export VIKING_TAG=${VIKING_TAG:-""}

if ! which apt-get &>/dev/null
then
  echo "This installation script requires apt-get. For manual installation instructions, consult https://github.com/binocarlos/viking ."
  exit 1
fi

apt-get update
apt-get install -y git make

cd ~ && test -d viking || git clone $VIKING_REPO
cd viking
git fetch origin

if [[ -n $VIKING_BRANCH ]]; then
  git checkout origin/$VIKING_BRANCH
elif [[ -n $VIKING_TAG ]]; then
  git checkout $VIKING_TAG
fi

make install

echo
echo "         _  _     _               "
echo " /\\   /\\(_)| | __(_) _ __    __ _ "
echo " \\ \\ / /| || |/ /| ||  _,\  / _,  |"
echo "  \\ V / | ||   < | || | | || (_| |"
echo "   \\_/  |_||_|\\_\\|_||_| |_| \\__, |"
echo "                            |___/ "
echo ""
echo "viking is installed - type 'viking help' to get help"