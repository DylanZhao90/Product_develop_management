import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import async_session
from app.middleware.error_handler import error_handler

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: register event handlers, start scheduler, init Redis
    from app.core.event_handlers import register_event_handlers
    from app.core.redis import get_redis
    from app.core.scheduler import start_scheduler

    register_event_handlers()
    start_scheduler(async_session)
    # Initialize Redis connection at startup
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

# Global error handler
app.middleware("http")(error_handler)

# CORS - allows Feishu workbench and browser access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.get("/api/health")
async def health_check():
    db_status = "unknown"
    try:
        async with async_session() as db:
            await db.execute(text("SELECT 1"))
            db_status = "ok"
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        db_status = "unavailable"
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "version": settings.app_version,
        "environment": settings.environment,
        "database": db_status,
    }
