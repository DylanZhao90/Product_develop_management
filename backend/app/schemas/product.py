from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    model: str = Field(..., min_length=1, max_length=64, description="Product model number")
    name: str = Field(..., min_length=1, max_length=128, description="Product display name")
    type: str | None = Field(None, pattern=r"^(ac_charger|dc_charger|portable)$", description="Product type")
    target_markets: list[str] | None = Field(None, max_length=20, description="Target market codes")
    certification_requirements: list[str] | None = Field(None, max_length=20, description="Required certifications")
    description: str | None = Field(None, max_length=2000, description="Product description")


class ProductUpdate(BaseModel):
    model: str | None = Field(None, min_length=1, max_length=64)
    name: str | None = Field(None, min_length=1, max_length=128)
    type: str | None = Field(None, pattern=r"^(ac_charger|dc_charger|portable)$")
    target_markets: list[str] | None = Field(None, max_length=20)
    certification_requirements: list[str] | None = Field(None, max_length=20)
    description: str | None = Field(None, max_length=2000)
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
    to_status: str = Field(
        ...,
        pattern=r"^(in_development|trial_handover|on_sale|discontinued|eol)$",
        description="Target lifecycle status",
    )
    reason: str | None = Field(None, max_length=1000)


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
