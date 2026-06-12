"""Global error handling middleware."""

import logging

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


async def error_handler(request: Request, call_next):
    """Catch unhandled exceptions and return consistent error responses.

    Full traceback is logged server-side; the client receives only a
    generic message to prevent information leakage.
    """
    try:
        return await call_next(request)
    except Exception:
        logger.exception("Unhandled exception processing %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Internal server error",
            },
        )
