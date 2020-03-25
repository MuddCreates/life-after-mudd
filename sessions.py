import os
import redis

# Some characters at the end of the token change each time, so we only use the
# first 40 characters to identify users
PREFIX_LENGTH = 40

# Heroku sets REDIS_URL to access the redis server
r = redis.from_url(os.environ.get("REDIS_URL"))


def add_token(token, expiration_seconds=500):
    r.setex(token[:PREFIX_LENGTH], expiration_seconds, "1")

def check_token(token):
    return r.exists(token[:PREFIX_LENGTH])
