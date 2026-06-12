from datetime import date, datetime

from pydantic import BaseModel


class CertificationCreate(BaseModel):
    product_id: str
    cert_type: str  # CE | FCC | UL | RoHS
    cert_number: str | None = None
    issued_by: str | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    cert_file_url: str | None = None
    remind_before_days: int = 90


class CertificationUpdate(BaseModel):
    cert_type: str | None = None
    cert_number: str | None = None
    issued_by: str | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    cert_file_url: str | None = None
    status: str | None = None
    remind_before_days: int | None = None


class CertificationResponse(BaseModel):
    id: str
    product_id: str
    cert_type: str
    cert_number: str | None = None
    issued_by: str | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    cert_file_url: str | None = None
    status: str = "valid"
    remind_before_days: int = 90
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
