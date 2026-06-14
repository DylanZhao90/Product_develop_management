import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse

from app.core.deps import CurrentUserDep, DBSessionDep
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Set httpOnly, secure, sameSite cookies for JWT tokens."""
    from app.core.config import get_settings

    settings = get_settings()
    is_prod = settings.environment == "production"

    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 86400,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        path="/",
    )


def _clear_auth_cookies(response: Response):
    """Clear auth cookies on logout."""
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


async def check_rate_limit(ip: str, max_per_min: int = 5) -> bool:
    from app.core.redis import get_redis

    redis = await get_redis()
    key = f"rate_limit:refresh:{ip}"
    now = int(time.time())
    window_start = now - 60
    async with redis.pipeline(transaction=True) as pipe:
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, 60)
        _, count, _, _ = await pipe.execute()
    return count <= max_per_min


@router.get("/feishu/login")
async def feishu_login():
    import secrets

    from app.core.config import get_settings
    from app.core.redis import get_redis

    settings = get_settings()
    state = secrets.token_urlsafe(32)
    redis = await get_redis()
    await redis.set(f"oauth_state:{state}", "1", ex=600)

    redirect_uri = settings.feishu_redirect_uri or (
        f"{settings.cors_origins[0]}/auth/callback" if settings.cors_origins else ""
    )
    auth_url = (
        f"{settings.feishu_base_url}/authen/v1/authorize"
        f"?app_id={settings.feishu_app_id}"
        f"&redirect_uri={redirect_uri}"
        f"&state={state}"
    )
    return {"auth_url": auth_url, "state": state}


@router.post("/feishu/callback")
async def feishu_callback(request: Request, response: Response, db: DBSessionDep):
    """Handle Feishu OAuth callback. Sets httpOnly cookies with JWT tokens."""
    body = await request.json()
    code = body.get("code")
    state = body.get("state")

    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Authorization code is required")
    if not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth state parameter is required")

    from app.core.redis import get_redis

    redis = await get_redis()
    state_valid = await redis.delete(f"oauth_state:{state}")
    if not state_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OAuth state")

    from app.integrations.feishu.auth import FeishuAuthClient

    feishu_client = FeishuAuthClient()
    try:
        user_info = await feishu_client.exchange_code(code)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Feishu auth failed: {str(e)}")

    auth_service = AuthService(db)
    try:
        tokens = await auth_service.feishu_sso_login(user_info)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    # Set httpOnly cookies
    _set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"])

    return {"success": True, "user": tokens["user"]}


@router.get("/me")
async def get_me(current_user: CurrentUserDep, db: DBSessionDep):
    auth_service = AuthService(db)
    return await auth_service.get_current_user_info(str(current_user.id))


@router.post("/refresh")
async def refresh_token(request: Request, response: Response, db: DBSessionDep):
    """Refresh access token using refresh token from httpOnly cookie."""
    ip = request.client.host if request.client else "unknown"
    if not await check_rate_limit(ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many refresh requests. Please try again later.",
        )

    # Read refresh_token from cookie (fallback to body for API clients)
    refresh_token_str = request.cookies.get("refresh_token")
    if not refresh_token_str:
        try:
            body = await request.json()
            refresh_token_str = body.get("refresh_token")
        except Exception:
            pass
    if not refresh_token_str:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="refresh_token is required")

    from app.core.security import (
        create_access_token,
        create_refresh_token,
        is_token_revoked,
        revoke_token,
        verify_token,
    )
    from app.core.config import get_settings

    payload = verify_token(refresh_token_str, type_claim="refresh")
    if payload is None:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    jti = payload.get("jti")
    if jti is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token identifier (jti)")

    if await is_token_revoked(jti):
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked — possible token reuse detected. Please log in again.",
        )

    user_id = payload.get("sub")
    from app.repositories.user_repo import UserRepository

    user = await UserRepository(db).get_by_id(user_id)
    if not user or not user.is_active:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    settings = get_settings()
    access_token = create_access_token(subject=user_id)
    new_refresh_token = create_refresh_token(subject=user_id)

    expire_seconds = settings.refresh_token_expire_days * 86400
    await revoke_token(jti, expire_seconds)

    # Set new httpOnly cookies
    _set_auth_cookies(response, access_token, new_refresh_token)

    return {"success": True, "token_type": "bearer"}


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookies and revoke tokens (best-effort)."""
    _clear_auth_cookies(response)
    return {"success": True, "message": "Logged out successfully"}
