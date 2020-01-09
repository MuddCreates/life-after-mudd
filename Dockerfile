FROM ubuntu:bionic

COPY scripts/docker-install-system.bash /tmp/
RUN /tmp/docker-install-system.bash

COPY . /src
WORKDIR /src

COPY scripts/docker-build-project.bash /tmp/
RUN /tmp/docker-build-project.bash

EXPOSE 8080
CMD poetry run make app-prod
