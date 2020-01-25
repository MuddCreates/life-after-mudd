#!/usr/bin/env bash

set -e
set -o pipefail

tag=dev
run=yes
docker_build_args=()
docker_run_opts=()
docker_run_args=()

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
    docker_build_args=(
        "${docker_build_args[@]}"
        -f Dockerfile.dev
        --build-arg "UID=$UID"
    )
    docker_run_opts=(
        "${docker_run_opts[@]}"
        -v "$PWD:/home/docker/src"
    )
    if [[ -n "$1" ]]; then
        docker_run_args=(bash -c "$1")
    fi
fi

scripts/docker.bash                      \
    build . -t "life-after-mudd:${tag}"  \
    "${docker_build_args[@]}"

PORT="${PORT:-8080}"
HMR_PORT="${HMR_PORT:-8081}"
HOST="${HOST:-127.0.0.1}"
if [[ -n "$run" ]]; then
    scripts/docker.bash                                                    \
        run -it --rm                                                       \
        -e PORT -e HMR_PORT                                                \
        -p "${HOST}:${PORT}:${PORT}" -p "${HOST}:${HMR_PORT}:${HMR_PORT}"  \
        -e LAM_OAUTH_PRIVATE_KEY                                           \
        "${docker_run_opts[@]}"                                            \
        "life-after-mudd:${tag}" "${docker_run_args[@]}"
fi
