FROM ubuntu:eoan

COPY scripts/docker-install-system.bash /tmp/
RUN /tmp/docker-install-system.bash

COPY . /src
WORKDIR /src

COPY scripts/docker-build-project.bash /tmp/
RUN /tmp/docker-build-project.bash

EXPOSE 8080

# Heroku sets HOME to our working directory, which makes no sense. Fix
# it. The PYTHONUNBUFFERED is because Python decides to do the
# hilarious thing where it just keeps everything printed to stderr in
# an internal buffer forever, so you never get to see the logs (but
# only in production). Fun fun fun. What a great idea. Why didn't I
# think of that.
CMD HOME=/root PYTHONUNBUFFERED=1 poetry run make app-prod HOST=0.0.0.0 LAM_TLS_ENABLED=1 LAM_ANALYTICS_ENABLED=1
