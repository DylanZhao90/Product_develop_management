"""Authentication service with Feishu SSO integration."""

from app.core.security import create_access_token, create_refresh_token
from app.middleware.audit import AuditLogger
from app.models.user import User
from app.repositories.user_repo import UserRepository
from sqlalchemy.ext.asyncio import AsyncSession


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def feishu_sso_login(self, feishu_user_info: dict) -> dict:
        """Login or register user via Feishu SSO.

        Args:
            feishu_user_info: User info from Feishu OAuth, containing:
                - open_id, union_id, name, email, avatar_url
        """
        open_id = feishu_user_info.get("open_id")
        user = await self.user_repo.get_by_feishu_open_id(open_id)

        if not user:
            # Auto-register new user (default role: engineer, admin assigns proper role)
            user = User(
                feishu_open_id=open_id,
                feishu_union_id=feishu_user_info.get("union_id"),
                name=feishu_user_info.get("name", "Unknown"),
                email=feishu_user_info.get("email"),
                avatar_url=feishu_user_info.get("avatar_url"),
                role="engineer",
            )
            user = await self.user_repo.create(user)
            await AuditLogger.log(self.db, user_id=str(user.id), action="user.register", resource_type="user", resource_id=str(user.id), new_value={"name": user.name, "role": "engineer", "source": "feishu_sso"})

        if not user.is_active:
            raise ValueError("User account is deactivated")

        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "avatar_url": user.avatar_url,
                "role": user.role,
                "language_pref": user.language_pref,
            },
        }

    async def get_current_user_info(self, user_id: str) -> dict:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        return {
            "id": str(user.id),
            "feishu_open_id": user.feishu_open_id,
            "name": user.name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "role": user.role,
            "supplier_id": str(user.supplier_id) if user.supplier_id else None,
            "language_pref": user.language_pref,
            "is_active": user.is_active,
        }
