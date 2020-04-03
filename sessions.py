import os
import sys

import redis

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
if redis_url:
    try:
        r = redis.from_url(redis_url)
    except Exception:
        print(
            f"Failed to connect to Redis, disabling OAuth caching: {redis_url}",
            file=sys.stderr,
        )
else:
    print("Redis URL unset, disabling OAuth caching", file=sys.stderr)


def add_token(token, expiration_seconds=OAUTH_CACHE_TIMEOUT):
    if r:
        r.sadd(SET_NAME, token)


def check_token(token):
    if r:
        return r.sismember(SET_NAME, token)
    else:
        return False
