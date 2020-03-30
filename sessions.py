import os
import redis

# Some characters at the end of the token change each time, so we only use the
# The first time dependent field is ~500 characters in (at_hash)
PREFIX_LENGTH = 475
SET_NAME = "TOKENS"

# Heroku sets REDIS_URL to access the redis server
redis_url = os.environ.get("REDIS_URL")
r = None
if redis_url is not None:
    try:
        r = redis.from_url(redis_url)
    except:
        print(f"failed to connect to redis at url: {redis_url}")


def add_token(token, expiration_seconds=500):
    if r is not None:
        r.sadd(SET_NAME, token[:PREFIX_LENGTH])


def check_token(token):
    if r is not None:
        return r.sismember(SET_NAME, token[:PREFIX_LENGTH])
    else:
        return False
