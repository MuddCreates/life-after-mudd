import os
import sys

import redis

# Each time an OAuth token is issued to the same user, the last few
# characters in the token change because they represent a hash which
# differs for each issuance. We want to use OAuth tokens as a way to
# identify when we are seeing the same user more than once, so we
# employ the following disgusting hack to just restrict our attention
# to the part of the token that doesn't change. This variable holds
# the length of the prefix that we consider.
PREFIX_LENGTH = 475

# Redis key used to store the set of known-good tokens.
SET_NAME = "TOKENS"

# How many seconds it takes before we forget about OAuth tokens we
# have seen and we'll re-do the API call to validate them if we see
# them again.
OAUTH_CACHE_TIMEOUT = 30 * 86400  # one month

# In production, we expect REDIS_URL to be set by Heroku. In
# development, it comes from docker-compose.yml.
redis_url = os.environ.get("REDIS_URL")
r = None
if redis_url is not None:
    try:
        r = redis.from_url(redis_url)
    except Exception:
        print(
            f"Failed to connect to Redis, disabling OAuth caching: {redis_url}",
            file=sys.stderr,
        )


def add_token(token, expiration_seconds=OAUTH_CACHE_TIMEOUT):
    if r is not None:
        r.sadd(SET_NAME, token[:PREFIX_LENGTH])


def check_token(token):
    if r is not None:
        return r.sismember(SET_NAME, token[:PREFIX_LENGTH])
    else:
        return False
