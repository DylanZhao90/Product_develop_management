"""Global error handling middleware."""

import logging

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.exceptions import AppException

logger = logging.getLogger(__name__)


async def error_handler(request: Request, call_next):
    """Catch unhandled exceptions and return consistent error responses.

    Full traceback is logged server-side; the client receives only a
    generic message to prevent information leakage. Application-level
    exceptions (AppException) return their status code and detail.
    """
    try:
        return await call_next(request)
    except AppException as e:
        logger.warning(
            "Application error processing %s %s: %s (status=%d)",
            request.method, request.url.path, e.detail, e.status_code,
        )
        return JSONResponse(
            status_code=e.status_code,
            content={"success": False, "message": e.detail},
        )
    except Exception:
        logger.exception("Unhandled exception processing %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Internal server error",
            },
        )
