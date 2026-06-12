import time

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.deps import CurrentUserDep, DBSessionDep
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

# Simple in-memory rate limiter for /refresh endpoint
_refresh_attempts: dict[str, list[float]] = {}


def check_rate_limit(ip: str, max_per_min: int = 5) -> bool:
    """Return True if request is allowed, False if rate-limited (max attempts per minute)."""
    now = time.time()
    window = 60.0  # 1 minute
    attempts = _refresh_attempts.setdefault(ip, [])
    # Purge entries outside the window
    cutoff = now - window
    _refresh_attempts[ip] = [t for t in attempts if t > cutoff]
    if len(_refresh_attempts[ip]) >= max_per_min:
        return False
    _refresh_attempts[ip].append(now)
    return True


@router.get("/feishu/login")
async def feishu_login():
    """Redirect to Feishu OAuth consent page."""
    from app.core.config import get_settings

    settings = get_settings()
    redirect_uri = settings.feishu_redirect_uri or (f"{settings.cors_origins[0]}/auth/callback" if settings.cors_origins else "")
    auth_url = (
        f"{settings.feishu_base_url}/authen/v1/authorize"
        f"?app_id={settings.feishu_app_id}"
        f"&redirect_uri={redirect_uri}"
    )
    return {"auth_url": auth_url}


@router.post("/feishu/callback")
async def feishu_callback(request: Request, db: DBSessionDep):
    """Handle Feishu OAuth callback. Exchange code for user info, create/update user, return JWT."""
    body = await request.json()
    code = body.get("code")
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Authorization code is required")

    from app.integrations.feishu.auth import FeishuAuthClient

    feishu_client = FeishuAuthClient()
    try:
        user_info = await feishu_client.exchange_code(code)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Feishu auth failed: {str(e)}")

    auth_service = AuthService(db)
    try:
        tokens = await auth_service.feishu_sso_login(user_info)
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/me")
async def get_me(current_user: CurrentUserDep, db: DBSessionDep):
    """Get current user info from JWT token."""
    auth_service = AuthService(db)
    return await auth_service.get_current_user_info(str(current_user.id))


@router.post("/refresh")
async def refresh_token(request: Request, db: DBSessionDep):
    """Refresh access token using refresh token (with rotation — old token is revoked)."""
    # Rate limit: max 5 attempts per minute per IP
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many refresh requests. Please try again later.",
        )

    body = await request.json()
    refresh_token = body.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="refresh_token is required")

    from app.core.security import (
        create_access_token,
        create_refresh_token,
        is_token_revoked,
        revoke_token,
        verify_token,
    )
    from app.core.config import get_settings

    payload = verify_token(refresh_token, type_claim="refresh")
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    # Extract jti for revocation check
    jti = payload.get("jti")
    if jti is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token identifier (jti)")

    # Check if this token has already been revoked (compromised token detection)
    if await is_token_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked — possible token reuse detected. Please log in again.",
        )

    user_id = payload.get("sub")
    from app.repositories.user_repo import UserRepository

    user = await UserRepository(db).get_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # Issue new tokens (rotation)
    settings = get_settings()
    access_token = create_access_token(subject=user_id)
    new_refresh_token = create_refresh_token(subject=user_id)

    # Revoke the old refresh token
    expire_seconds = settings.refresh_token_expire_days * 86400
    await revoke_token(jti, expire_seconds)

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }
