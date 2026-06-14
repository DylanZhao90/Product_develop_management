"""Security headers middleware — adds best-practice HTTP security headers."""


async def security_headers_middleware(request, call_next):
    """Add security-related HTTP headers to every response."""
    response = await call_next(request)

    headers = response.headers

    # Prevent MIME type sniffing
    headers["X-Content-Type-Options"] = "nosniff"

    # Prevent clickjacking
    headers["X-Frame-Options"] = "DENY"

    # XSS protection for older browsers
    headers["X-XSS-Protection"] = "1; mode=block"

    # Referrer policy
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Content Security Policy (report-only in dev, enforce in prod)
    headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "connect-src 'self' https://open.feishu.cn; "
        "frame-ancestors 'none'"
    )

    # HSTS (only in production with HTTPS)
    # In production behind Nginx, this should be set by the reverse proxy

    # Permissions policy
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    # Remove server signature
    headers.pop("Server", None)
    headers.pop("X-Powered-By", None)

    return response
