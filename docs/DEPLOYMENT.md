# PDM 部署计划

## 部署策略: 渐进式上线

```
Phase 1 MVP (6/13)  →  Phase 2 增量 (7/1)  →  Phase 3 增量 (7/25)  →  全量上线 (8/15)
```

核心理念: **不要等到全部做完才上线。Phase 1 已经有完整的核心链路，先部署让团队用起来。**

---

## 1. 环境规划

| 环境 | 用途 | 配置 |
|------|------|------|
| **dev** | 本地开发 | Docker Compose，开发者本机 |
| **staging** | 预发布验证 | 云服务器 4C8G，与生产同配置 |
| **prod** | 生产环境 | 云服务器 / K8s 集群 |

---

## 2. 第一阶段: MVP 快速上线 (6/13 前)

> 目标: 用最低成本把 Phase 1 功能跑起来，供内部团队使用

### 方案 A: 单机 Docker Compose (推荐先走这个)

```bash
# 1. 准备一台云服务器 (4C8G, Ubuntu 22.04)
#    - 阿里云 ECS / 腾讯云 CVM / AWS EC2 均可
#    - 预装 Docker + Docker Compose

# 2. 克隆代码
git clone <repo> /opt/pdm
cd /opt/pdm

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env:
#   SECRET_KEY=<生成随机字符串>
#   ENVIRONMENT=production
#   DEBUG=false
#   CORS_ORIGINS=https://pdm.your-company.com
#   FEISHU_APP_ID=<飞书应用 ID>
#   FEISHU_APP_SECRET=<飞书应用密钥>
#   POSTGRES_PASSWORD=<强密码>
#   MINIO_ROOT_PASSWORD=<强密码>

# 4. 启动
docker-compose up -d

# 5. 初始化数据库
docker-compose exec backend alembic upgrade head

# 6. 配置 Nginx 反向代理 (宿主机)
#    - 80/443 → frontend:3000 (SPA)
#    - /api → backend:8000
#    - /minio → minio:9000 (或单独域名 files.your-company.com)
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

    # MinIO (or use separate subdomain)
    location /files/ {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
    }

    client_max_body_size 100m;  # 固件上传
}
```

### 飞书应用配置清单

上线前需在飞书开放平台完成:

- [ ] 创建企业自建应用
- [ ] 配置 OAuth 回调 URL: `https://pdm.your-company.com/auth/callback`
- [ ] 开通权限: 获取用户信息、发送消息、审批、任务、日历
- [ ] 配置事件订阅 URL: `https://pdm.your-company.com/api/v1/callbacks/feishu/event`
- [ ] 发布应用并获取 `APP_ID` + `APP_SECRET`
- [ ] 在飞书管理后台创建审批模板 (审批码: `PROJECT_REVIEW`)

---

## 3. 第二阶段: 生产加固 (随 Phase 2-3 渐进)

### 数据库

```bash
# 定时备份 (crontab)
0 2 * * * pg_dump -U pdm pdm | gzip > /backup/pdm_$(date +\%Y\%m\%d).sql.gz

# 保留最近 30 天备份
find /backup -name "pdm_*.sql.gz" -mtime +30 -delete
```

### 监控

```bash
# 健康检查
curl https://pdm.your-company.com/api/health

# 推荐接入:
# - Uptime Kuma (免费, 自部署) 做存活监控
# - Sentry (免费 tier) 做错误追踪
# - Prometheus + Grafana (后续)
```

### 日志

```bash
# Docker 日志轮转 (docker-compose.yml)
logging:
  driver: "json-file"
  options:
    max-size: "100m"
    max-file: "3"
```

---

## 4. 最终部署: K8s (Phase 4 结束, 约 8/15)

### 集群规划

```
┌─────────────────────────────────────────────┐
│                  K8s Cluster                 │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ frontend │  │ backend  │  │  minio   │  │
│  │   2×     │  │   3×     │  │   1×     │  │
│  └──────────┘  └────┬─────┘  └──────────┘  │
│                      │                       │
│  ┌──────────────────┼───────────────────┐   │
│  │    postgres      │      redis        │   │
│  │ (云托管/主从)    │  (sentinel 高可用) │   │
│  └──────────────────┴───────────────────┘   │
└─────────────────────────────────────────────┘
```

### K8s 资源定义 (待 Phase 4 编写)

```
k8s/
  ├── namespace.yaml
  ├── configmap.yaml
  ├── secret.yaml
  ├── backend-deployment.yaml
  ├── backend-service.yaml
  ├── frontend-deployment.yaml
  ├── frontend-service.yaml
  ├── ingress.yaml
  └── cronjob-backup.yaml
```

### CI/CD 流水线 (GitHub Actions)

```yaml
# .github/workflows/deploy.yml (待创建)
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker-compose -f docker-compose.ci.yml run backend pytest
  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build & push Docker images
        run: |
          docker build -t registry.your-company.com/pdm-backend:${{ github.sha }} ./backend
          docker push registry.your-company.com/pdm-backend:${{ github.sha }}
  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to K8s
        run: |
          kubectl set image deployment/pdm-backend \
            backend=registry.your-company.com/pdm-backend:${{ github.sha }}
          kubectl rollout status deployment/pdm-backend
```

---

## 5. 各环境配置清单

### 生产环境密钥生成

```bash
# SECRET_KEY
openssl rand -hex 32

# POSTGRES_PASSWORD
openssl rand -base64 24

# JWT 密钥 (与 SECRET_KEY 共用或独立)
openssl rand -hex 32
```

### 域名规划

| 服务 | 域名 |
|------|------|
| PDM 前端 | `pdm.your-company.com` |
| PDM API | `pdm.your-company.com/api` |
| 文件存储 | `files.your-company.com` 或 `pdm.your-company.com/files` |
| MinIO Console | 不对外暴露 (内部 VPN 访问 `:9001`) |

---

## 6. 上线 Checklist

### MVP 上线 (6/13)
- [ ] `.env` 生产配置完成 (强密码, 随机密钥)
- [ ] Nginx HTTPS 配置
- [ ] 域名 DNS 解析
- [ ] 飞书应用发布
- [ ] 数据库初始 migration 执行
- [ ] 管理员账号创建 (直接写 DB 或飞书登录后改角色)
- [ ] 健康检查通过: `GET /api/health`
- [ ] 飞书 SSO 登录可走通
- [ ] 产品创建 → 项目创建 → 任务树 全链路验证

### Phase 2 增量 (7/1)
- [ ] MinIO bucket 创建 + 权限配置
- [ ] 设计文件上传/下载验证
- [ ] 供应商账号登录验证

### Phase 3 增量 (7/25)
- [ ] 固件文件上传 + OTA 任务验证
- [ ] 工单创建 → 处理 → 关闭 全链路
- [ ] 分析图表数据验证

### 全量上线 (8/15)
- [ ] K8s 部署就绪
- [ ] CI/CD 流水线跑通
- [ ] 数据库备份自动化
- [ ] 监控告警配置
- [ ] 压测通过 (100 并发用户)
- [ ] 文档全部更新

---

## 7. 成本估算 (月度)

### MVP 阶段 (单机)

| 资源 | 规格 | 月费 (约) |
|------|------|-----------|
| 云服务器 | 4C8G, 100G SSD | ¥300-600 |
| 域名 + SSL | — | ¥50-100 |
| 飞书 | 免费 (企业已购) | ¥0 |
| **合计** | | **¥350-700** |

### 生产全量 (K8s)

| 资源 | 规格 | 月费 (约) |
|------|------|-----------|
| K8s 集群 (3 节点) | 或云托管 DB + 2 节点 | ¥2000-4000 |
| 托管 PostgreSQL | 2C4G, 100G | ¥500-1000 |
| 托管 Redis | 2G 内存 | ¥200-400 |
| 对象存储 (替代 MinIO) | 100G + 流量 | ¥100-300 |
| 负载均衡 + 公网 IP | — | ¥200-400 |
| **合计** | | **¥3000-6000** |
