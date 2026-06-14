"""Request ID middleware — injects unique request_id into every request context.

The request_id is:
1. Extracted from the X-Request-ID header if provided by the client/upstream proxy
2. Generated as a UUIDv4 if missing
3. Returned in the X-Request-ID response header
4. Attached to the request.state for use by downstream handlers and loggers
"""

import logging
import uuid

from fastapi import Request

logger = logging.getLogger(__name__)


async def request_id_middleware(request: Request, call_next):
    """Inject and propagate request_id for tracing and structured logging."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id

    response = await call_next(request)

    response.headers["X-Request-ID"] = request_id
    return response
