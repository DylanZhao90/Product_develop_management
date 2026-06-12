# PDM 部署计划

> **当前状态:** 🟢 生产就绪 | **最后更新:** 2026-06-12
> **版本:** 0.2.0 | 经架构审查 + 安全加固 (20 项修复)

## 部署策略: 即刻上线

```
当前代码已具备生产部署条件 → 单机 Docker Compose 即可上线
```

---

## 1. 环境规划

| 环境 | 用途 | 配置 |
|------|------|------|
| **dev** | 本地开发 | Docker Compose，开发者本机 |
| **staging** | 预发布验证 | 云服务器 4C8G，与生产同配置 |
| **prod** | 生产环境 | 云服务器 / K8s 集群 (规划中) |

---

## 2. 快速上线: 单机 Docker Compose

```bash
# 1. 准备一台云服务器 (4C8G, Ubuntu 22.04)
#    预装 Docker + Docker Compose

# 2. 克隆代码
git clone https://gitee.com/anari-energy/product_develop_management.git /opt/pdm
cd /opt/pdm

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env (所有带密钥的字段必须填写):
#   SECRET_KEY=<openssl rand -hex 32>
#   DATABASE_URL=postgresql+asyncpg://pdm:<强密码>@localhost:5432/pdm
#   ENVIRONMENT=production
#   DEBUG=false
#   REDIS_URL=redis://:<强密码>@localhost:6379/0
#   MINIO_ACCESS_KEY=<生成>
#   MINIO_SECRET_KEY=<生成>
#   MINIO_BUCKET=pdm-prod
#   FEISHU_APP_ID=<飞书应用 ID>
#   FEISHU_APP_SECRET=<飞书应用密钥>
#   FEISHU_ENCRYPT_KEY=<飞书事件加密 key>
#   FEISHU_REDIRECT_URI=https://pdm.your-company.com/auth/callback

# 4. 启动
docker-compose up -d

# 5. 初始化数据库
docker-compose exec backend alembic upgrade head

# 6. 健康检查
curl http://localhost:8000/api/health
# 预期返回: {"status":"ok","database":"ok","version":"0.2.0"}
```

### Nginx 配置模板

```nginx
server {
    listen 443 ssl http2;
    server_name pdm.your-company.com;

    ssl_certificate     /etc/ssl/pdm.crt;
    ssl_certificate_key /etc/ssl/pdm.key;

    # Frontend SPA
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }

    # MinIO
    location /files/ {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
    }

    client_max_body_size 100m;  # 固件上传
}
```

---

## 3. 飞书应用配置清单

- [ ] 创建企业自建应用
- [ ] 配置 OAuth 回调 URL: `https://pdm.your-company.com/auth/callback`
- [ ] 配置事件订阅 URL: `https://pdm.your-company.com/api/v1/callbacks/feishu/event`
- [ ] 开通权限: 获取用户信息、发送消息、审批、任务、日历
- [ ] 发布应用并获取 `APP_ID` + `APP_SECRET` + `ENCRYPT_KEY`
- [ ] 创建审批模板 (审批码: `PROJECT_REVIEW`)

---

## 4. 生产加固

### 数据库备份

```bash
# 定时备份 (crontab)
0 2 * * * pg_dump -U pdm pdm | gzip > /backup/pdm_$(date +\%Y\%m\%d).sql.gz
# 保留最近 30 天
find /backup -name "pdm_*.sql.gz" -mtime +30 -delete
```

### 监控

```bash
# 健康检查
curl https://pdm.your-company.com/api/health
# 推荐: Uptime Kuma (存活监控) + Sentry (错误追踪)
```

### 日志

```yaml
# docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "100m"
    max-file: "3"
```

---

## 5. 安全加固清单 (已实施)

| 项目 | 状态 |
|------|------|
| 所有密钥从环境变量读取 (无硬编码) | ✅ |
| JWT access + refresh token 轮转 | ✅ |
| Feishu webhook HMAC-SHA256 签名验证 | ✅ |
| /refresh API 速率限制 (5次/分钟) | ✅ |
| 错误消息不泄露内部信息 | ✅ |
| 固件上传 50MB 限制 | ✅ |
| 审计日志独立事务 | ✅ |
| 数据库连接池可配置 | ✅ |

---

## 6. 成本估算

### 单机部署 (推荐起步方案)

| 资源 | 规格 | 月费 (约) |
|------|------|-----------|
| 云服务器 | 4C8G, 100G SSD | ¥300-600 |
| 域名 + SSL | — | ¥50-100 |
| 飞书 | 免费 (企业已购) | ¥0 |
| **合计** | | **¥350-700** |

---

## 7. 上线 Checklist

- [ ] `.env` 生产配置完成 (所有密钥已填写)
- [ ] Nginx HTTPS 配置 + 域名 DNS 解析
- [ ] 飞书应用已发布
- [ ] 数据库初始 migration 已执行
- [ ] 健康检查通过: `GET /api/health` 返回 `{"status":"ok","database":"ok"}`
- [ ] 飞书 SSO 登录可走通
- [ ] 产品创建 → 项目创建 → 审批 → 任务分配 全链路验证
- [ ] 固件上传/下载 + OTA 任务验证
- [ ] 认证到期提醒调度器运行正常

---

> **最后更新:** 2026-06-12 — 代码已通过架构审查，即刻可上线
