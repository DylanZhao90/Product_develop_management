import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as SA_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        SA_UUID, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    feishu_open_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    feishu_union_id: Mapped[str | None] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(64))
    email: Mapped[str | None] = mapped_column(String(128))
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(
        String(32), default="engineer"
    )  # admin | pm | designer | engineer | supplier | cert_specialist | ops
    supplier_id: Mapped[str | None] = mapped_column(
        SA_UUID, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True
    )
    language_pref: Mapped[str] = mapped_column(String(8), default="zh-CN")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())
