"""FastAPI dependency injection."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import is_token_revoked, verify_token
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)

DBSessionDep = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    db: DBSessionDep,
    request: Request | None = None,
) -> User:
    """Extract and validate the current user from JWT token.

    Token sources (checked in order):
    1. Authorization header (Bearer token) — API clients
    2. httpOnly cookie (access_token) — browser SPA
    """
    token: str | None = None

    if credentials is not None:
        token = credentials.credentials
    elif request is not None:
        token = request.cookies.get("access_token")

    if token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # Check if the token's jti has been revoked (applies to refresh tokens and
    # any token carrying a jti claim)
    jti = payload.get("jti")
    if jti and await is_token_revoked(jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    from app.repositories.user_repo import UserRepository

    # get_by_id now filters by is_active=True; inactive users are excluded
    user = await UserRepository(db).get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def require_role(*roles: str):
    """Dependency factory: require one of the given roles."""

    async def role_checker(current_user: CurrentUserDep):
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return Depends(role_checker)


# Predefined role groups
ROLE_ADMIN = "admin"

async def get_admin_user(current_user: CurrentUserDep) -> User:
    """Require admin role — returned user is guaranteed to be an admin."""
    if current_user.role != ROLE_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


AdminUserDep = Annotated[User, Depends(get_admin_user)]


ROLE_PM = "pm"
ROLE_DESIGNER = "designer"
ROLE_ENGINEER = "engineer"
ROLE_SUPPLIER = "supplier"
ROLE_CERT_SPECIALIST = "cert_specialist"
ROLE_OPS = "ops"

ALL_INTERNAL = [ROLE_ADMIN, ROLE_PM, ROLE_DESIGNER, ROLE_ENGINEER, ROLE_CERT_SPECIALIST, ROLE_OPS]
