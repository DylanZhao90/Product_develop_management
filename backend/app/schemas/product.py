from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    model: str
    name: str
    type: str | None = None  # ac_charger | dc_charger | portable
    target_markets: list[str] | None = None
    certification_requirements: list[str] | None = None
    description: str | None = None


class ProductUpdate(BaseModel):
    model: str | None = None
    name: str | None = None
    type: str | None = None
    target_markets: list[str] | None = None
    certification_requirements: list[str] | None = None
    description: str | None = None
    product_manager_id: str | None = None


class ProductResponse(BaseModel):
    id: str
    code: str
    model: str
    name: str
    type: str | None = None
    target_markets: Any | None = None
    certification_requirements: Any | None = None
    lifecycle_status: str = "in_development"
    product_manager_id: str | None = None
    thumbnail_url: str | None = None
    description: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class LifecycleTransitionRequest(BaseModel):
    to_status: str = Field(..., description="Target lifecycle status")
    reason: str | None = None


class LifecycleChangeLogResponse(BaseModel):
    id: str
    product_id: str
    from_status: str
    to_status: str
    approval_id: str | None = None
    changed_by: str | None = None
    reason: str | None = None
    changed_at: datetime | None = None

    model_config = {"from_attributes": True}
