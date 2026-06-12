import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as SA_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DesignFile(Base):
    __tablename__ = "design_files"

    id: Mapped[str] = mapped_column(
        SA_UUID, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    product_id: Mapped[str] = mapped_column(
        SA_UUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_name: Mapped[str] = mapped_column(String(256), nullable=False)
    file_type: Mapped[str] = mapped_column(String(32))  # step | igs | pdf | stl | dxf
    version: Mapped[int] = mapped_column(Integer, default=1)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)  # MinIO object key
    file_size: Mapped[int | None] = mapped_column(BigInteger)
    uploaded_by: Mapped[str | None] = mapped_column(SA_UUID, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    change_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
