"""Feishu SSO OAuth integration."""

import httpx

from app.core.config import get_settings

settings = get_settings()


class FeishuAuthClient:
    """Handle Feishu OAuth 2.0 flow for SSO."""

    def __init__(self):
        self.app_id = settings.feishu_app_id
        self.app_secret = settings.feishu_app_secret
        self.base_url = settings.feishu_base_url

    async def exchange_code(self, code: str) -> dict:
        """Exchange authorization code for user access token and user info."""
        async with httpx.AsyncClient(timeout=10.0) as http:
            # Step 1: Get user access token
            resp = await http.post(
                f"{self.base_url}/authen/v1/oidc/access_token",
                headers={"Content-Type": "application/json"},
                json={
                    "grant_type": "authorization_code",
                    "code": code,
                },
            )
            data = resp.json()
            if data.get("code") != 0:
                raise Exception(f"Feishu OAuth token exchange failed: {data}")

            access_token = data["data"]["access_token"]

            # Step 2: Get user info
            resp2 = await http.get(
                f"{self.base_url}/authen/v1/user_info",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
            user_data = resp2.json()
            if user_data.get("code") != 0:
                raise Exception(f"Feishu user info failed: {user_data}")

            info = user_data["data"]
            return {
                "open_id": info.get("open_id"),
                "union_id": info.get("union_id"),
                "name": info.get("name", "Unknown"),
                "email": info.get("email"),
                "avatar_url": info.get("avatar_url"),
            }

    async def get_user_info_by_token(self, access_token: str) -> dict:
        """Get user info with an existing access token (for subsequent API calls)."""
        async with httpx.AsyncClient(timeout=10.0) as http:
            resp = await http.get(
                f"{self.base_url}/authen/v1/user_info",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            data = resp.json()
            if data.get("code") != 0:
                raise Exception(f"Feishu user info failed: {data}")
            return data["data"]
