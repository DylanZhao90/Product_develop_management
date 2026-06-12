# PDM 部署操作手册

> 适用版本: 0.2.0 | 最后更新: 2026-06-11

---

## 前置条件

| 依赖 | 版本要求 | 检查命令 |
|------|---------|---------|
| Docker | ≥ 24.0 | `docker --version` |
| Docker Compose | ≥ 2.20 | `docker compose version` |
| 飞书应用 | 已创建并审核通过 | 飞书开放平台 |

### 飞书应用所需配置

在 [飞书开放平台](https://open.feishu.cn/app) 创建应用，需要：

| 配置项 | 说明 |
|--------|------|
| **App ID / App Secret** | 应用凭证，在「凭证与基础信息」页 |
| **Encrypt Key** | 事件订阅的加密 key |
| **OAuth 重定向 URL** | `http://<你的域名或IP>/api/v1/auth/feishu/callback` |
| **机器人** | 启用并配置消息权限 |
| **审批** | 创建审批实例 `PROJECT_REVIEW` |
| **权限** | `获取用户信息` `创建审批` `发送消息` `任务` `日历` |

---

## 第一步：配置环境变量

```bash
cd Product_develop_management
cp .env.example .env
```

编辑 `.env`，必填项：

```bash
# 安全（务必修改！）
SECRET_KEY=<生成一个随机字符串，至少32位>

# 飞书（你的凭证）
FEISHU_APP_ID=cli_xxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_ENCRYPT_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx

# 以下保持默认即可
POSTGRES_DB=pdm
POSTGRES_USER=pdm
POSTGRES_PASSWORD=pdm_dev_2026
ENVIRONMENT=development
DEBUG=true
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

> 生成 SECRET_KEY: `openssl rand -hex 32`

---

## 第二步：启动服务

```bash
# 构建并启动所有容器
docker compose up -d --build

# 等待 PostgreSQL 就绪（约 20 秒）
sleep 20

# 执行数据库迁移
docker compose exec backend alembic upgrade head
```

验证五个服务都在运行：

```bash
docker compose ps
```

预期输出：
```
NAME           STATUS
pdm-postgres   Up (healthy)
pdm-redis      Up (healthy)
pdm-minio      Up (healthy)
pdm-backend    Up
pdm-frontend   Up
```

---

## 第三步：验证

```bash
# 后端健康检查
curl http://localhost:8000/api/health
# → {"status":"ok","version":"0.1.0","environment":"development"}

# API 文档（浏览器打开）
# http://localhost:8000/api/docs

# 前端（浏览器打开）
# http://localhost:3000
```

---

## 第四步：首次登录

```
1. 打开 http://localhost:3000
2. 点击飞书登录
3. 飞书扫码授权
4. 自动注册为 engineer 角色
```

**将第一个用户提升为管理员**（通过数据库）：

```bash
docker compose exec postgres psql -U pdm -d pdm -c \
  "UPDATE users SET role='admin' WHERE email='你的飞书邮箱';"
```

或者进入 admin 页面（登录后修改 URL 为 `/admin`，admin 角色可见）。

---

## 常用操作

```bash
# 查看日志
docker compose logs -f backend

# 重启后端（代码修改后）
docker compose restart backend

# 进入后端容器调试
docker compose exec backend bash

# 重新构建前端
docker compose exec frontend npm run build

# 运行测试
docker compose exec backend pytest tests/ -v

# 创建新数据库迁移（修改模型后）
docker compose exec backend alembic revision --autogenerate -m "描述"
docker compose exec backend alembic upgrade head
```

---

## 部署到云服务器

如果部署到云服务器（如阿里云/AWS），额外步骤：

```bash
# 1. 修改 .env
CORS_ORIGINS=http://你的域名,http://服务器IP:3000
ENVIRONMENT=production
DEBUG=false

# 2. 修改 docker-compose.yml 中飞书 OAuth 重定向地址
# 飞书开放平台 → 安全设置 → 重定向 URL → 添加:
#   http://你的域名/api/v1/auth/feishu/callback

# 3. 防火墙开放端口
# 80/443 (Nginx) 或 3000 (直连)
# 建议前端 build 后用 Nginx 反代，不要直接暴露 3000

# 4. 启动
docker compose up -d
```

---

## 故障排查

| 现象 | 排查 |
|------|------|
| 后端启动失败 | `docker compose logs backend`，检查数据库连接 |
| 飞书登录报错 | 检查 `FEISHU_APP_ID` / `SECRET`，确认重定向 URL 已配 |
| 文件上传失败 | MinIO console `http://localhost:9001`，确认 bucket 存在 |
| 数据库连接拒绝 | `docker compose logs postgres`，检查端口 5432 |
| 前端空白页 | `docker compose logs frontend`，检查 API base URL |

---

## 数据备份

```bash
# PostgreSQL
docker compose exec postgres pg_dump -U pdm pdm > backup_$(date +%Y%m%d).sql

# 恢复
docker compose exec -T postgres psql -U pdm pdm < backup_20260611.sql
```

---

## 停止系统

```bash
# 保留数据
docker compose down

# 完全清除（删除所有数据！）
docker compose down -v
```
