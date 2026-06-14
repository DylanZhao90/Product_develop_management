"""Custom application exceptions.

All business-logic exceptions should use these classes so the global
error handler can map them to appropriate HTTP status codes.
"""


class AppException(Exception):
    """Base exception for all application-level errors."""

    status_code: int = 500
    detail: str = "Internal server error"

    def __init__(self, detail: str | None = None, status_code: int | None = None):
        self.detail = detail or self.detail
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.detail)


class NotFoundError(AppException):
    """Resource not found."""
    status_code = 404
    detail = "Resource not found"


class BadRequestError(AppException):
    """Invalid request data."""
    status_code = 400
    detail = "Bad request"


class UnauthorizedError(AppException):
    """Authentication required or invalid."""
    status_code = 401
    detail = "Authentication required"


class ForbiddenError(AppException):
    """Insufficient permissions."""
    status_code = 403
    detail = "Insufficient permissions"


class ConflictError(AppException):
    """Resource conflict (e.g., duplicate, invalid state transition)."""
    status_code = 409
    detail = "Resource conflict"


class ServiceError(AppException):
    """External service error (e.g., Feishu API, MinIO)."""
    status_code = 502
    detail = "External service error"


class ValidationError(AppException):
    """Business validation failed (use Pydantic for schema validation)."""
    status_code = 422
    detail = "Validation error"
