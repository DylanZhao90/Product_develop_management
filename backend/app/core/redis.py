import asyncio

import redis.asyncio as aioredis

from app.core.config import get_settings

settings = get_settings()
redis_client: aioredis.Redis | None = None
_init_lock = asyncio.Lock()


async def get_redis() -> aioredis.Redis:
    """Get the Redis client singleton with thread-safe lazy initialization."""
    global redis_client
    if redis_client is not None:
        return redis_client

    async with _init_lock:
        if redis_client is not None:  # Double-check after acquiring lock
            return redis_client
        redis_client = aioredis.from_url(
            settings.redis_url, encoding="utf-8", decode_responses=True
        )
        return redis_client
