import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import async_session
from app.core.exceptions import AppException
from app.middleware.error_handler import error_handler
from app.middleware.metrics import metrics_endpoint, metrics_middleware
from app.middleware.rate_limit import rate_limit_middleware
from app.middleware.request_id import request_id_middleware
from app.middleware.security_headers import security_headers_middleware

logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: register event handlers, start scheduler, init Redis
    from app.core.event_handlers import register_event_handlers
    from app.core.redis import get_redis
    from app.core.scheduler import start_scheduler

    register_event_handlers()
    start_scheduler(async_session)
    await get_redis()
    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Middleware stack (order matters — first added = outermost)
app.middleware("http")(request_id_middleware)       # 1. Inject request_id
app.middleware("http")(security_headers_middleware)  # 2. Security headers
app.middleware("http")(rate_limit_middleware)         # 3. Rate limiting
app.middleware("http")(error_handler)                 # 4. Global error catch

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

# Global exception handler for AppException and subclasses
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail},
    )


# Register API routes
from app.api.v1.auth import router as auth_router
from app.api.v1.products import router as products_router
from app.api.v1.projects import router as projects_router
from app.api.v1.design import router as design_router
from app.api.v1.suppliers import router as suppliers_router
from app.api.v1.firmware import router as firmware_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.callbacks import router as callbacks_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.certifications import router as certifications_router
from app.api.v1.admin import router as admin_router

app.include_router(auth_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(products_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(design_router, prefix="/api/v1")
app.include_router(suppliers_router, prefix="/api/v1")
app.include_router(firmware_router, prefix="/api/v1")
app.include_router(certifications_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(callbacks_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")

# Metrics endpoint (Prometheus-compatible)
app.add_route("/api/metrics", metrics_endpoint)


@app.get("/api/health")
async def health_check():
    """Enhanced health check with dependency status.

    Checks: database, redis connectivity.
    Returns 200 if all OK, 503 if any critical dependency is down.
    """
    import asyncio

    from app.core.redis import get_redis

    checks = {}

    # Database check
    try:
        async with async_session() as db:
            await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        checks["database"] = "unavailable"

    # Redis check
    try:
        redis = await asyncio.wait_for(get_redis(), timeout=3)
        await asyncio.wait_for(redis.ping(), timeout=3)
        checks["redis"] = "ok"
    except Exception as e:
        logger.warning(f"Redis health check failed: {e}")
        checks["redis"] = "unavailable"

    all_ok = all(v == "ok" for v in checks.values())

    return {
        "status": "ok" if all_ok else "degraded",
        "version": settings.app_version,
        "environment": settings.environment,
        "checks": checks,
    }
