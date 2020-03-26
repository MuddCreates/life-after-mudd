#!/usr/bin/env bash

set -e
set -o pipefail

tag=dev
run=yes
docker_build_args=()
docker_run_opts=()
docker_run_args=()
export DOCKERFILE="Dockerfile"

if [[ "$1" == "--prod" || "$1" == "--prod-run" ]]; then
    tag=latest
    if [[ "$1" == "--prod-run" ]]; then
        if [[ -f .oauth-private-key.json ]]; then
            export LAM_OAUTH_PRIVATE_KEY="$(< .oauth-private-key.json)"
        else
            echo "no such file: .oauth-private-key.json" >&2
            exit 1
        fi
    else
        run=
    fi
else
    export DOCKERFILE="Dockerfile.dev"
    export REDIS_URL="redis://localhost:6379"
    # export VOLUME_PATH="/home/docker/src"
    # I'm not sure what this is meant to do, but I'm sure that I'm breaking it
    if [[ -n "$1" ]]; then
        docker_run_args=(bash -c "$1")
    fi
fi

scripts/docker-compose.bash build

PORT="${PORT:-8080}"
HMR_PORT="${HMR_PORT:-8081}"
HOST="${HOST:-127.0.0.1}"
if [[ -n "$run" ]]; then
    scripts/docker-compose.bash run
fi
