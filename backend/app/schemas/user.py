from datetime import datetime

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    feishu_open_id: str | None = None
    feishu_union_id: str | None = None
    name: str
    email: str | None = None
    avatar_url: str | None = None
    role: str = "engineer"
    supplier_id: str | None = None
    language_pref: str = "zh-CN"


class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    role: str | None = None
    supplier_id: str | None = None
    language_pref: str | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: str
    feishu_open_id: str | None = None
    name: str
    email: str | None = None
    avatar_url: str | None = None
    role: str
    supplier_id: str | None = None
    language_pref: str = "zh-CN"
    is_active: bool = True
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
