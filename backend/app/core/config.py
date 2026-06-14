from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    app_name: str = "Product Development & Lifecycle Management"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = True
    secret_key: str = ""  # Must be set via env/SECRET_KEY; validated at startup

    # Database
    database_url: str = ""  # Must be set via env/DATABASE_URL; validated at startup
    database_pool_size: int = 20
    database_max_overflow: int = 10

    # Redis
    redis_url: str = ""

    # MinIO
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = ""  # Must be set via env/MINIO_ACCESS_KEY
    minio_secret_key: str = ""  # Must be set via env/MINIO_SECRET_KEY
    minio_bucket: str = ""  # Must be set via env/MINIO_BUCKET
    minio_secure: bool = False

    # Feishu / Lark
    feishu_app_id: str = ""
    feishu_app_secret: str = ""
    feishu_base_url: str = "https://open.feishu.cn/open-apis"
    feishu_encrypt_key: str = ""
    feishu_verification_token: str = ""
    feishu_redirect_uri: str = "http://localhost:5173/auth/callback"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://pdm.anariev.com",
    ]

    # JWT
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Pagination
    default_page_size: int = 20
    max_page_size: int = 100

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @field_validator("secret_key", mode="after")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if not v:
            raise ValueError("SECRET_KEY must be set via environment variable")
        if len(v) < 32:
            raise ValueError(f"SECRET_KEY must be at least 32 characters (got {len(v)})")
        return v

    @field_validator("database_url", mode="after")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v:
            raise ValueError("DATABASE_URL must be set via environment variable")
        return v

    @model_validator(mode="after")
    def check_production_secret(self):
        if self.environment == "production" and len(self.secret_key) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters in production")
        return self

    @property
    def masked_database_url(self) -> str:
        """Return database_url with password masked for logging."""
        url = self.database_url
        if "@" in url:
            before_at, after_at = url.split("@", 1)
            if ":" in before_at:
                user_part, _ = before_at.rsplit(":", 1)
                return f"{user_part}:****@{after_at}"
        return url


@lru_cache()
def get_settings() -> Settings:
    return Settings()
