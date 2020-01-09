#!/usr/bin/env bash

set -e
set -o pipefail

cd /src
poetry install
yarn install
make build-prod
rm -rf node_modules

rm "$0"
