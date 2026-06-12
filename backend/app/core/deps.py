"""FastAPI dependency injection."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_token
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)

DBSessionDep = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    db: DBSessionDep,
) -> User:
    """Extract and validate the current user from JWT token."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    from app.repositories.user_repo import UserRepository

    user = await UserRepository(db).get_by_id(user_id)
    if not user or not user.is_active:
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
