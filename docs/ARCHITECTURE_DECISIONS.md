# Architecture Decision Records (ADR)

This document records significant architectural decisions for the PDM system.

## ADR-001: FastAPI + SQLAlchemy 2.0 Async Stack

**Status:** Accepted (2026-06)
**Context:** Need a high-performance Python backend with async support for I/O-bound operations (database, Feishu API, Redis, MinIO).
**Decision:** Use FastAPI with SQLAlchemy 2.0 async ORM + asyncpg driver.
**Consequences:**
- Full async I/O throughout the request lifecycle
- Pydantic v2 for schema validation with type safety
- Alembic for database migrations
- Trade-off: SQLAlchemy async ecosystem is maturing, some advanced patterns require workarounds

## ADR-002: Event Bus for Business Logic Decoupling

**Status:** Accepted (2026-06)
**Context:** Need to decouple core business logic (product lifecycle transitions, task assignments) from notification side effects (Feishu messages, audit logs).
**Decision:** Use an in-process pub/sub event bus with predefined topic constants.
**Consequences:**
- Clean separation between business logic and notifications
- Easy to add new subscribers without modifying core services
- Limitation: in-process only (single worker) — for multi-worker deployments, a message queue (Redis Streams/RabbitMQ) would be needed

## ADR-003: PostgreSQL UUID Primary Keys

**Status:** Accepted (2026-06)
**Context:** Need globally unique IDs across distributed services and potential MES/ERP integrations.
**Decision:** Use PostgreSQL UUID type as primary key for all tables.
**Consequences:**
- No sequential ID conflicts across environments
- Slightly larger index size vs integer keys
- Generated client-side (Python uuid4) to avoid round-trips
- Trade-off: UUIDs are not human-friendly for debugging (mitigated by product codes like AC-2026-0001)

## ADR-004: MinIO for File Storage

**Status:** Accepted (2026-06)
**Context:** Need file storage for design files (STEP, PDF, STL), firmware binaries, and certification documents.
**Decision:** Use MinIO (S3-compatible) with presigned URLs for download.
**Consequences:**
- S3 API compatibility enables easy migration to AWS S3 / Alibaba Cloud OSS
- Presigned URLs offload bandwidth from application server
- No file metadata search (mitigated by storing metadata in PostgreSQL)

## ADR-005: JWT with Refresh Token Rotation

**Status:** Accepted (2026-06)
**Context:** Need stateless authentication with token revocation capability.
**Decision:** Use JWT access tokens (30min) + refresh tokens (7 days) with rotation and Redis-backed revocation set.
**Consequences:**
- Access tokens are stateless (no DB lookup per request)
- Refresh token rotation detects token reuse
- Revoked tokens tracked in Redis SET with TTL
- Trade-off: requires Redis for revocation; access tokens cannot be instantly invalidated (max 30min window)

## ADR-006: Three-Layer Architecture (API → Service → Repository)

**Status:** Accepted (2026-06)
**Context:** Need maintainable codebase with clear separation of concerns.
**Decision:** Use three-layer architecture: API routes handle HTTP concerns, Services contain business logic, Repositories handle data access.
**Consequences:**
- Each layer can be tested independently
- Repository pattern enables swapping data sources
- Services own transaction boundaries (commit)
- Trade-off: more boilerplate than a thin-controller approach

## ADR-007: Custom Exception Hierarchy

**Status:** Accepted (2026-06, revised from ValueError pattern)
**Context:** Need consistent error handling across all services.
**Decision:** Use AppException base class with typed subclasses (NotFoundError, BadRequestError, ForbiddenError, ConflictError, ServiceError).
**Consequences:**
- Global error handler maps exceptions to HTTP status codes automatically
- Service code is cleaner (no HTTP coupling)
- API consumers receive consistent error format

## ADR-008: Rate Limiting with Redis Sliding Window

**Status:** Accepted (2026-06)
**Context:** Need to protect API from abuse and brute-force attacks.
**Decision:** Use Redis sorted sets for sliding window rate limiting, applied as middleware.
**Consequences:**
- Global protection without per-route boilerplate
- Auth endpoints get stricter limits (10/min)
- Graceful degradation if Redis is unavailable
- Trade-off: Redis sorted sets grow with traffic (mitigated by automatic cleanup)

## ADR-009: Security Headers Middleware

**Status:** Accepted (2026-06)
**Context:** Need defense-in-depth against common web vulnerabilities.
**Decision:** Apply security headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS via Nginx) as middleware.
**Consequences:**
- CSP may need adjustment for Feishu integration endpoints
- X-Frame-Options: DENY prevents embedding in iframes (intentional)
- HSTS configured at reverse proxy level (Nginx)
