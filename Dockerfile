FROM ubuntu:disco

COPY scripts/docker-install-system.bash /tmp/
RUN /tmp/docker-install-system.bash

COPY . /src
WORKDIR /src

COPY scripts/docker-build-project.bash /tmp/
RUN /tmp/docker-build-project.bash

EXPOSE 8080

# Heroku sets HOME to our working directory, which makes no sense. Fix
# it.
CMD HOME=/root poetry run make app-prod HOST=0.0.0.0 LAM_TLS_ENABLED=1
