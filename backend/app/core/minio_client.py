"""MinIO client for file storage — async-friendly upload, download, presigned URLs."""

import asyncio
from functools import partial

from minio import Minio
from minio.error import S3Error

from app.core.config import get_settings

settings = get_settings()

_client: Minio | None = None


def _get_minio_sync() -> Minio:
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


async def get_minio() -> Minio:
    """Get MinIO client (wraps sync init in executor to avoid blocking)."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _get_minio_sync)


async def upload_file(
    object_key: str, data: bytes, content_type: str = "application/octet-stream"
) -> str:
    """Upload to MinIO in thread executor. Returns the object key."""
    import io

    client = await get_minio()
    bucket = settings.minio_bucket

    loop = asyncio.get_running_loop()
    put_fn = partial(
        client.put_object,
        bucket,
        object_key,
        io.BytesIO(data),
        len(data),
        content_type,
    )
    await loop.run_in_executor(None, put_fn)
    return object_key


async def get_file_url(object_key: str, expires: int = 3600) -> str:
    """Generate a presigned download URL (default 1h expiry)."""
    client = await get_minio()
    bucket = settings.minio_bucket

    loop = asyncio.get_running_loop()
    from datetime import timedelta

    presigned_fn = partial(
        client.presigned_get_object,
        bucket,
        object_key,
        expires=timedelta(seconds=expires),
    )
    return await loop.run_in_executor(None, presigned_fn)


async def delete_file(object_key: str) -> None:
    """Delete a file from MinIO."""
    client = await get_minio()
    bucket = settings.minio_bucket

    loop = asyncio.get_running_loop()
    remove_fn = partial(client.remove_object, bucket, object_key)
    await loop.run_in_executor(None, remove_fn)
