from datetime import datetime
from typing import Any

from pydantic import BaseModel


# ---- Firmware Version ----

class FirmwareVersionCreate(BaseModel):
    product_model: str
    version: str
    file_url: str
    file_size: int | None = None
    file_hash: str | None = None
    release_notes: str | None = None
    release_type: str = "full"  # full | incremental


class FirmwareVersionResponse(BaseModel):
    id: str
    product_model: str
    version: str
    file_url: str
    file_size: int | None = None
    file_hash: str | None = None
    release_notes: str | None = None
    release_type: str = "full"
    released_by: str | None = None
    released_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ---- OTA Upgrade Task ----

class FirmwareUpgradeTaskCreate(BaseModel):
    firmware_version_id: str
    target_sn_filter: dict | None = None
    gray_scale_percent: int = 100


class FirmwareUpgradeTaskUpdate(BaseModel):
    status: str | None = None
    gray_scale_percent: int | None = None
    target_sn_filter: dict | None = None
    success_count: int | None = None
    failure_count: int | None = None
    total_count: int | None = None
    failure_reasons: list[dict] | None = None
    feishu_notification_sent: bool | None = None


class FirmwareUpgradeTaskResponse(BaseModel):
    id: str
    firmware_version_id: str
    target_sn_filter: Any | None = None
    gray_scale_percent: int = 100
    status: str = "scheduled"
    success_count: int = 0
    failure_count: int = 0
    total_count: int = 0
    failure_reasons: Any | None = None
    feishu_notification_sent: bool = False
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
