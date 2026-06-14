"""Rate limiting middleware using Redis sliding window.

Protects all API endpoints from abuse. Configurable per-route limits.
"""

import time

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.redis import get_redis

# Default: 100 requests per minute per IP
DEFAULT_RATE_LIMIT = 100
DEFAULT_WINDOW_SECONDS = 60

# Stricter limits for auth endpoints
AUTH_RATE_LIMIT = 10  # requests per minute


async def rate_limit_middleware(request: Request, call_next):
    """Apply sliding-window rate limiting to all API requests.

    Auth endpoints (/auth/*) get stricter limits.
    Health check is excluded.
    """
    # Skip rate limiting for health check
    if request.url.path == "/api/health":
        return await call_next(request)

    try:
        redis = await get_redis()
    except Exception:
        # If Redis is unavailable, allow the request through
        return await call_next(request)

    ip = request.client.host if request.client else "unknown"
    is_auth = "/auth/" in request.url.path

    limit = AUTH_RATE_LIMIT if is_auth else DEFAULT_RATE_LIMIT
    window = DEFAULT_WINDOW_SECONDS

    key = f"rate_limit:{ip}:{request.url.path}"
    now = time.time()
    window_start = now - window

    try:
        async with redis.pipeline(transaction=True) as pipe:
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            pipe.zadd(key, {str(now): now})
            pipe.expire(key, window + 10)
            _, count, _, _ = await pipe.execute()

        if count > limit:
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "message": f"Rate limit exceeded. {limit} requests per {window}s allowed.",
                    "retry_after": window,
                },
                headers={"Retry-After": str(window)},
            )
    except Exception:
        # If Redis fails during rate check, allow through
        pass

    return await call_next(request)
