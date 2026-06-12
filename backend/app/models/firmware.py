import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as SA_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FirmwareVersion(Base):
    __tablename__ = "firmware_versions"

    id: Mapped[str] = mapped_column(
        SA_UUID, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    product_model: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)  # MinIO key
    file_size: Mapped[int | None] = mapped_column(Integer)
    file_hash: Mapped[str | None] = mapped_column(String(128))  # SHA256 for integrity
    release_notes: Mapped[str | None] = mapped_column(Text)
    release_type: Mapped[str] = mapped_column(String(16), default="full")  # full | incremental
    released_by: Mapped[str | None] = mapped_column(SA_UUID, nullable=True)
    released_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FirmwareUpgradeTask(Base):
    __tablename__ = "firmware_upgrade_tasks"

    id: Mapped[str] = mapped_column(
        SA_UUID, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    firmware_version_id: Mapped[str] = mapped_column(
        SA_UUID, ForeignKey("firmware_versions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    target_sn_filter: Mapped[dict | None] = mapped_column(
        JSONB
    )  # {"models":[],"batches":[],"regions":[],"sn_list":[]}
    gray_scale_percent: Mapped[int] = mapped_column(Integer, default=100)
    status: Mapped[str] = mapped_column(
        String(32), default="scheduled"
    )  # scheduled | in_progress | completed | failed
    success_count: Mapped[int] = mapped_column(Integer, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, default=0)
    total_count: Mapped[int] = mapped_column(Integer, default=0)
    failure_reasons: Mapped[dict | None] = mapped_column(JSONB)  # [{"reason":"...","count":N}]
    feishu_notification_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str | None] = mapped_column(SA_UUID, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())
