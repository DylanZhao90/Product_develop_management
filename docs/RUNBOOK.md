# PDM System — Operations Runbook

## Service Architecture

```
Nginx (:80/443) → Frontend (SPA static files)
                → Backend (:8000) → PostgreSQL (:5432)
                                  → Redis (:6379)
                                  → MinIO (:9000)
```

## Health Check

```bash
# Check overall health
curl http://localhost:8000/api/health
# Expected: {"status":"ok","version":"0.1.0","environment":"production","checks":{"database":"ok","redis":"ok"}}

# Check just the API is responding
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health
```

## Common Operations

### Database Migrations

```bash
# Apply pending migrations
docker-compose exec backend alembic upgrade head

# Check current migration status
docker-compose exec backend alembic current

# Create a new migration after model changes
docker-compose exec backend alembic revision --autogenerate -m "description"
```

### Service Management

```bash
# Restart all services
docker-compose down && docker-compose up -d

# Restart just the backend
docker-compose restart backend

# View logs
docker-compose logs -f backend
docker-compose logs -f --tail=100 postgres
```

### Backup

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U pdm pdm > backup_$(date +%Y%m%d).sql

# Restore PostgreSQL
docker-compose exec -T postgres psql -U pdm pdm < backup_20260614.sql

# Backup MinIO data
docker run --rm -v pdm_minio_data:/data -v $(pwd):/backup alpine tar czf /backup/minio_backup.tar.gz -C /data .
```

### Redis

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli -a pdm_redis_2026

# Check rate limiting keys
redis-cli -a pdm_redis_2026 KEYS "rate_limit:*" | head -20

# Flush rate limit keys only (emergency)
redis-cli -a pdm_redis_2026 --scan --pattern "rate_limit:*" | xargs redis-cli -a pdm_redis_2026 DEL
```

## Troubleshooting

### Backend won't start

1. Check PostgreSQL is healthy: `docker-compose ps postgres`
2. Check logs: `docker-compose logs backend --tail=50`
3. Verify DATABASE_URL in docker-compose.yml matches PostgreSQL credentials
4. Verify migrations are applied: `docker-compose exec backend alembic current`

### 502 Bad Gateway from Nginx

1. Check backend is running: `docker-compose ps backend`
2. Check backend port: `curl http://localhost:8000/api/health`
3. Verify Nginx config: `nginx -t`
4. Reload Nginx: `nginx -s reload`

### Rate limit (429) errors

1. Check Redis is running: `docker-compose ps redis`
2. If Redis is down, rate limiter degrades gracefully (allows requests)
3. Check current rate limit keys: `redis-cli KEYS "rate_limit:*" | wc -l`
4. To clear all limits: use the Redis flush command above

### High memory usage

1. Check Redis memory: `docker stats pdm-redis`
2. Redis is configured with `maxmemory 128mb` and `allkeys-lru` eviction
3. Check PostgreSQL connections: `docker-compose exec postgres psql -U pdm -c "SELECT count(*) FROM pg_stat_activity;"`
4. Max connections is 100 in docker-compose.yml

## Monitoring Checklist

- [ ] `/api/health` returns 200
- [ ] PostgreSQL connection pool not exhausted (< 80%)
- [ ] Redis memory usage < 100MB
- [ ] MinIO disk usage < 80%
- [ ] Nginx error log empty (last 1 hour)
- [ ] No 5xx errors in backend logs (last 1 hour)
- [ ] Cert expiring scheduler ran successfully
