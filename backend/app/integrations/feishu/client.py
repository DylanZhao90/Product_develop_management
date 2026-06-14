"""Feishu (Lark) Open API HTTP client with token management."""

import json
import time

import httpx

from app.core.config import get_settings
from app.core.redis import get_redis

settings = get_settings()

TOKEN_CACHE_KEY = "feishu:tenant_access_token"
TOKEN_TTL = 7200  # 2h, refresh 5min before expiry


class FeishuClient:
    """Base client for Feishu Open API."""

    def __init__(self):
        self.base_url = settings.feishu_base_url
        self.app_id = settings.feishu_app_id
        self.app_secret = settings.feishu_app_secret

    async def get_tenant_access_token(self) -> str:
        redis = await get_redis()
        token = await redis.get(TOKEN_CACHE_KEY)
        if token:
            return token

        async with httpx.AsyncClient() as http:
            resp = await http.post(
                f"{self.base_url}/auth/v3/tenant_access_token/internal",
                json={"app_id": self.app_id, "app_secret": self.app_secret},
            )
            data = resp.json()
            if data.get("code") != 0:
                raise Exception(f"Failed to get tenant access token: {data}")

            token = data["tenant_access_token"]
            expires = data.get("expire", TOKEN_TTL)
            await redis.set(TOKEN_CACHE_KEY, token, ex=expires - 300)  # refresh early
            return token

    async def request(self, method: str, path: str, **kwargs) -> dict:
        token = await self.get_tenant_access_token()
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {token}"
        headers["Content-Type"] = "application/json"

        async with httpx.AsyncClient(timeout=10.0) as http:
            resp = await http.request(method, f"{self.base_url}{path}", headers=headers, **kwargs)
            data = resp.json()
            if data.get("code") != 0:
                raise Exception(f"Feishu API error [{path}]: {data}")
            return data.get("data", data)

    async def post(self, path: str, **kwargs) -> dict:
        return await self.request("POST", path, **kwargs)

    async def get(self, path: str, **kwargs) -> dict:
        return await self.request("GET", path, **kwargs)

    async def patch(self, path: str, **kwargs) -> dict:
        return await self.request("PATCH", path, **kwargs)

    async def delete(self, path: str, **kwargs) -> dict:
        return await self.request("DELETE", path, **kwargs)
