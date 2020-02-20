#!/usr/bin/env bash

set -e
set -o pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl gnupg
rm -rf /var/lib/apt/lists/*

curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -

tee -a /etc/apt/sources.list.d/yarn.list >/dev/null <<"EOF"
deb https://dl.yarnpkg.com/debian/ stable main
EOF

packages="

# in case we need superuser
sudo

# for managing the repository
git

# for build system
make

# for column(1) in 'make help'
bsdmainutils

# to run webapp
python3

# to install Poetry
python3-pip

# needed for Poetry
python3-venv

# to install JS dependencies
yarn

# to install deps for react-mapbox-gl fork
npm

"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y $(grep -v "^#" <<< "$packages")
rm -rf /var/lib/apt/lists/*

# Latest version of Poetry doesn't work on Ubuntu; workaround from
# <https://bugs.launchpad.net/usd-importer/+bug/1794041/comments/10>.
pip3 --disable-pip-version-check install -U keyrings.alt

# Use Poetry to install project dependencies. Use the most recent
# version because it just fixes *so* many bugs compared to pre-1.0.
pip3 --disable-pip-version-check install poetry==1.0.0

rm "$0"
