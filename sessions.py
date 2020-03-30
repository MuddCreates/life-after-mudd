import os

import redis

# Each time an OAuth token is issued to the same user, the last few
# characters in the token change because they represent a hash which
# differs for each issuance. We want to use OAuth tokens as a way to
# identify when we are seeing the same user more than once, so we
# employ the following disgusting hack to just restrict our attention
# to the part of the token that doesn't change.
PREFIX_LENGTH = 475
SET_NAME = "TOKENS"

# In production, we expect REDIS_URL to be set by Heroku. In
# development, it comes from docker-compose.yml.
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
