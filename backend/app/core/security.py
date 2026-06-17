import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.core.redis import get_redis

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = settings.jwt_algorithm

REVOKED_TOKENS_PREFIX = "revoked_tokens"


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode: dict[str, Any] = {"sub": subject, "exp": expire, "type": "access", "iss": "pdm-api"}
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    to_encode: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "type": "refresh",
        "iss": "pdm-api",
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)


async def is_token_revoked(jti: str) -> bool:
    """Check if a token's jti has been revoked in Redis.

    Each revoked token is stored as an independent key with its own TTL,
    so no single key grows unbounded.
    """
    redis = await get_redis()
    return bool(await redis.exists(f"{REVOKED_TOKENS_PREFIX}:{jti}"))


async def revoke_token(jti: str, expire_seconds: int) -> None:
    """Add a token's jti to the revoked set with an independent TTL.

    Each jti gets its own key ``revoked_tokens:{jti}`` with ``expire_seconds``
    TTL, so entries expire independently and the key space stays bounded.
    """
    redis = await get_redis()
    await redis.setex(f"{REVOKED_TOKENS_PREFIX}:{jti}", expire_seconds, "1")


def verify_token(
    token: str, type_claim: str | None = None, options: dict | None = None
) -> dict[str, Any] | None:
    if options is None:
        options = {"verify_aud": False}
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM], options=options)
        if type_claim is not None and payload.get("type") != type_claim:
            return None
        if payload.get("iss") is not None and payload["iss"] != "pdm-api":
            return None
        return payload
    except JWTError:
        return None


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
