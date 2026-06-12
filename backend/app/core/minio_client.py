"""MinIO client for file storage — upload, download, presigned URLs."""

from minio import Minio
from minio.error import S3Error

from app.core.config import get_settings

settings = get_settings()

_client: Minio | None = None


def get_minio() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        bucket = settings.minio_bucket
        if not _client.bucket_exists(bucket):
            _client.make_bucket(bucket)
    return _client


def upload_file(object_key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    """Upload to MinIO. Returns the object key."""
    import io

    client = get_minio()
    bucket = settings.minio_bucket
    client.put_object(
        bucket,
        object_key,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    return object_key


def get_file_url(object_key: str, expires: int = 3600) -> str:
    """Generate a presigned download URL (default 1h expiry)."""
    client = get_minio()
    bucket = settings.minio_bucket
    return client.presigned_get_object(bucket, object_key, expires=__import__("datetime").timedelta(seconds=expires))


def delete_file(object_key: str) -> None:
    client = get_minio()
    bucket = settings.minio_bucket
    client.remove_object(bucket, object_key)
