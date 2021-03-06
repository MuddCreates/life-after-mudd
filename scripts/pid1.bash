#!/usr/bin/env bash

set -e
set -o pipefail

# For some reason SHELL=/bin/sh by default in the Ubuntu image, which
# messes up tmux.
export SHELL="$(which bash)"

# Similarly, the localization stuff is broken in the image, so we have
# to fix it for one of our Python deps to work properly.
export LANG=C.UTF-8
export LC_ALL=C.UTF-8

# We can't use virtualenvs.in-project because the virtualenv contains
# hardcoded absolute paths, therefore can't be shared between host and
# container.
export POETRY_VIRTUALENVS_PATH="$PWD/.docker-venv"

poetry install
yarn install
exec poetry run "$@"
