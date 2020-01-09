#!/usr/bin/env bash

set -e
set -o pipefail

if (( $# != 1 )); then
    echo "usage: docker-install.bash UID" >&2
    exit 1
fi

uid="$1"

packages="

# download watchexec
wget

# make it easier to run multiple commands
tmux

"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y $(grep -v "^#" <<< "$packages")
rm -rf /var/lib/apt/lists/*

cd /tmp
wget -nv https://github.com/watchexec/watchexec/releases/download/1.12.0/watchexec-1.12.0-x86_64-unknown-linux-gnu.deb
dpkg -i watchexec-*.deb
rm watchexec-*.deb

useradd --uid="$uid" --create-home --groups sudo docker
passwd -d docker

rm "$0"
