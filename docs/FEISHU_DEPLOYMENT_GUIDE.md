# PDM 飞书部署上架完整指南

> Product Development & Lifecycle Management — 企业内部飞书应用部署
> 最后更新: 2026-06-12 | 版本: 0.2.0

---

## 目录

1. [系统概览](#1-系统概览)
2. [前置准备](#2-前置准备)
3. [服务器部署](#3-服务器部署)
4. [飞书开放平台配置](#4-飞书开放平台配置)
5. [环境变量配置](#5-环境变量配置)
6. [数据库初始化](#6-数据库初始化)
7. [启动系统](#7-启动系统)
8. [验证测试](#8-验证测试)
9. [生产加固](#9-生产加固)
10. [常见问题](#10-常见问题)
11. [附录](#11-附录)

---

## 1. 系统概览

### 系统定位

PDM (产品研发管理平台) 是部署在飞书工作台的企业内部应用，供安纳瑞能源的 PM、硬件工程师、结构设计师、认证专员、供应商使用，覆盖充电桩产品从立项到退市的全生命周期管理。

### 飞书集成能力

| 能力 | 用户感知 | 技术实现 |
|------|---------|---------|
| **SSO 扫码登录** | 打开应用→飞书扫码→进入系统 | OAuth 2.0 网页应用 |
| **审批工作流** | PM 在飞书端审批项目立项 | 飞书审批 API + 回调 |
| **消息机器人** | 任务分配、逾期催办、认证到期通知 | 飞书消息卡片 |
| **任务中心同步** | WBS 任务出现在飞书任务列表 | 飞书任务 API |
| **日历同步** | 项目里程碑出现飞书日历 | 飞书日历 API |

### 技术架构

```
飞书工作台 → Nginx(:443) → Frontend(React SPA :3000)
                          → Backend(FastAPI :8000)
                              ├── PostgreSQL 16
                              ├── Redis 7
                              └── MinIO (文件存储)
```

---

## 2. 前置准备

### 2.1 服务器要求

| 项目 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 磁盘 | 50 GB SSD | 100 GB SSD |
| 系统 | Ubuntu 20.04+ | Ubuntu 22.04 |
| 带宽 | 5 Mbps | 10 Mbps |

### 2.2 软件依赖

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo apt install docker-compose-plugin

# 验证
docker --version        # ≥ 24.0
docker compose version  # ≥ 2.20
```

### 2.3 飞书管理员权限

操作者需要：
- 飞书企业管理员账号
- 飞书开放平台 (https://open.feishu.cn) 访问权限
- 有能力创建企业自建应用并发布

### 2.4 域名 (可选但推荐)

| 用途 | 域名示例 |
|------|---------|
| 前端 + API | `pdm.anari.com` |
| 文件存储 | `files.anari.com` |

> 如果没有域名，可以用服务器 IP + 端口直接访问。但飞书 OAuth 回调要求域名或 IP 在白名单中。

---

## 3. 服务器部署

### 3.1 克隆代码

```bash
git clone https://gitee.com/anari-energy/product_develop_management.git /opt/pdm
cd /opt/pdm
```

### 3.2 生成密钥

```bash
# JWT 签名密钥 (Seceret Key)
openssl rand -hex 32
# 输出示例: a1b2c3d4e5f6... (64字符)

# 数据库密码
openssl rand -base64 24
# 输出示例: Xk9mP2vL7qR4nT8...

# Redis 密码
openssl rand -base64 16

# MinIO 密钥
openssl rand -hex 16
```

### 3.3 配置 .env

```bash
cp .env.example .env
vim .env
```

填入内容（见 [第5节](#5-环境变量配置)）。

### 3.4 Docker Compose 启动

```bash
# 构建并启动
docker compose up -d --build

# 查看运行状态
docker compose ps
# 预期输出: 5 个容器均为 Up 状态

# 查看日志
docker compose logs -f backend
```

### 3.5 Nginx 反向代理

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

创建配置文件 `/etc/nginx/sites-available/pdm`:

```nginx
server {
    listen 80;
    server_name pdm.anari.com;  # 替换为你的域名

    # 固件上传限制
    client_max_body_size 100m;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # MinIO 文件访问
    location /files/ {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
    }
}
```

启用并配置 HTTPS：

```bash
sudo ln -s /etc/nginx/sites-available/pdm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 申请 SSL 证书 (需要域名已解析)
sudo certbot --nginx -d pdm.anari.com
```

---

## 4. 飞书开放平台配置

> 以下操作均在 https://open.feishu.cn 完成，耗时约 30 分钟。

### 4.1 创建应用

```
1. 飞书管理员登录 https://open.feishu.cn
2. 点击「开发者后台」→「创建企业自建应用」
3. 填写:
   应用名称: 纳研PDM
   应用描述: 产品研发与生命周期管理平台
   应用图标: 上传公司 logo
4. 点击「确定创建」
```

### 4.2 获取凭证

进入应用详情 → 左侧「凭证与基础信息」：

| 字段 | 说明 | 填入 .env |
|------|------|----------|
| **App ID** | `cli_xxxxxxxxxxxx` | `FEISHU_APP_ID` |
| **App Secret** | 仅显示一次 | `FEISHU_APP_SECRET` |
| **Encrypt Key** | 点击「重新生成」获取 | `FEISHU_ENCRYPT_KEY` |

> ⚠️ App Secret 只显示一次，请立即复制保存！

### 4.3 配置网页应用 (SSO 登录)

```
左侧「应用能力」→「添加应用能力」→ 选择「网页应用」

配置:
  桌面端主页: https://pdm.anari.com
  移动端主页: https://pdm.anari.com
```

然后配置 OAuth 重定向 URL：

```
左侧「安全设置」→「重定向 URL」

添加以下 URL (一行一个):
  https://pdm.anari.com/auth/callback
  http://localhost:3000/auth/callback          (本地开发用)
  http://localhost:5173/auth/callback          (Vite 开发服务器)
```

### 4.4 添加机器人能力

```
左侧「应用能力」→「添加应用能力」→ 选择「机器人」

配置:
  机器人名称: 纳研助手
  机器人描述: PDM 研发任务通知、认证到期提醒
```

### 4.5 配置审批能力

#### 4.5.1 启用审批

```
左侧「应用能力」→「添加应用能力」→ 选择「审批」
```

#### 4.5.2 创建审批定义

```
1. 飞书管理后台 → 审批 → 审批管理 → 创建审批
2. 审批名称: 项目立项审批
3. 表单字段:
   - 项目名称    单行文本  必填
   - 产品型号    单行文本
   - 项目类型    下拉选择  (新品研发/版本升级)
   - 可行性文档  附件
4. 审批流程: 按公司审批链设置
5. 保存后，记录审批 Code 为 PROJECT_REVIEW
   (如果不是，修改 backend/app/integrations/feishu/approval.py 中的值)
```

### 4.6 配置权限

```
左侧「权限管理」

搜索并开通以下权限 (全部勾选"应用身份"和"用户身份"):

┌──────────────────────────────────────────────┐
│ 权限名称                          │ 用途      │
├──────────────────────────────────────────────┤
│ 获取用户基本信息                   │ SSO 登录  │
│ 获取用户 user_id                  │ 用户标识  │
│ 获取用户邮箱信息                   │ 账号关联  │
│ 获取用户手机号                     │ 联系方式  │
│ 获取通讯录用户信息                 │ 用户搜索  │
│                                │          │
│ 审批应用: 创建审批实例             │ 项目审批  │
│ 审批应用: 查看审批实例             │ 状态查询  │
│                                │          │
│ 获取与发送单聊消息                 │ 消息通知  │
│ 获取与发送群聊消息                 │ 群通知    │
│                                │          │
│ 任务: 创建、更新、删除任务         │ WBS 同步  │
│                                │          │
│ 日历: 创建、更新、删除日程         │ 里程碑    │
└──────────────────────────────────────────────┘

开通后点击「批量开通」提交。
```

### 4.7 配置事件订阅 (审批准回调)

```
左侧「事件订阅」→ 开启开关

请求网址:
  https://pdm.anari.com/api/v1/callbacks/feishu/event

订阅事件:
  ✅ 审批实例状态变更
  ✅ 审批任务状态变更
  ✅ 机器人消息事件 (可选，用于卡片交互)

保存 → 飞书会发送 challenge 验证请求
(系统已实现 challenge 自动应答，保存即成功)
```

### 4.8 发布应用

```
左侧「版本管理与发布」→「创建版本」

  版本号: 1.0.0
  更新说明: 初始版本 - 产品研发管理 (SSO/审批/消息/任务/日历)
  可用范围: ○ 所有员工

点击「保存」→「申请线上发布」
(管理员审核通过后状态变为「已发布」✅)
```

### 4.9 配置飞书工作台入口

发布后，员工可在飞书工作台看到「纳研PDM」应用：

```
飞书客户端 → 工作台 → 搜索「纳研PDM」
点击进入即可使用（首次使用需授权）
```

---

## 5. 环境变量配置

完整 `.env` 文件模板：

```bash
# ==========================================
# 应用配置
# ==========================================
APP_NAME=纳研PDM
ENVIRONMENT=production
DEBUG=false

# 使用第 3.2 节生成的随机值
SECRET_KEY=<openssl rand -hex 32>

# ==========================================
# 数据库
# ==========================================
DATABASE_URL=postgresql+asyncpg://pdm:<数据库密码>@postgres:5432/pdm
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# ==========================================
# Redis
# ==========================================
REDIS_URL=redis://:<Redis密码>@redis:6379/0

# ==========================================
# MinIO (文件存储)
# ==========================================
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=<MinIO Access Key>
MINIO_SECRET_KEY=<MinIO Secret Key>
MINIO_BUCKET=pdm-prod
MINIO_SECURE=false

# ==========================================
# 飞书开放平台 (必填)
# ==========================================
FEISHU_APP_ID=cli_xxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_ENCRYPT_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_BASE_URL=https://open.feishu.cn/open-apis
FEISHU_REDIRECT_URI=https://pdm.anari.com/auth/callback

# ==========================================
# CORS
# ==========================================
CORS_ORIGINS=["https://pdm.anari.com","http://localhost:3000"]

# ==========================================
# JWT
# ==========================================
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

---

## 6. 数据库初始化

```bash
# 进入后端容器
docker compose exec backend bash

# 执行数据库迁移
alembic upgrade head

# 验证表已创建
python3 -c "
from app.core.database import engine, Base
from app.models import *
print('Tables:', sorted(Base.metadata.tables.keys()))
"
```

预期输出 13 张表：

```
Tables: ['audit_logs', 'certifications', 'design_files', 'firmware_upgrade_tasks',
'firmware_versions', 'lifecycle_change_logs', 'outsource_tasks', 'products',
'project_tasks', 'projects', 'suppliers', 'technical_issues', 'users']
```

---

## 7. 启动系统

### 7.1 启动所有服务

```bash
cd /opt/pdm
docker compose up -d
```

### 7.2 查看状态

```bash
docker compose ps
```

预期 5 个容器全部 `Up`：

| 容器 | 端口 | 说明 |
|------|------|------|
| pdm-backend | 8000 | FastAPI 后端 |
| pdm-frontend | 3000 | React 前端 |
| pdm-postgres | 5432 | PostgreSQL 数据库 |
| pdm-redis | 6379 | Redis 缓存 |
| pdm-minio | 9000/9001 | MinIO 对象存储 |

### 7.3 健康检查

```bash
# API 健康检查
curl http://localhost:8000/api/health
# {"status":"ok","database":"ok","version":"0.2.0","environment":"production"}

# 前端可访问
curl -I http://localhost:3000
# HTTP/1.1 200 OK
```

---

## 8. 验证测试

### 8.1 飞书 SSO 登录

```
1. 浏览器打开 https://pdm.anari.com
2. 点击「飞书登录」
3. 跳转到飞书授权页面
4. 用飞书扫码或点击「授权」
5. 自动跳回系统 Dashboard ✅
```

### 8.2 核心流程验证

```
1. 创建产品
   产品管理 → 新建产品 → 填写型号/名称/类型 → 保存
   预期: 自动生成产品编号 (如 AC-2026-0001)

2. 创建项目
   产品详情 → 关联项目 → 新建项目 → 提交审批
   预期: 飞书收到审批通知

3. 飞书审批
   飞书端打开审批 → 点击"通过"
   预期: 系统自动更新项目状态为"已通过"

4. 创建任务
   项目详情 → 任务 → 新建任务 → 分配负责人
   预期: 被分配人收到飞书消息通知，任务出现在飞书任务中心

5. 固件上传
   固件管理 → 上传 → 选择 .bin 文件
   预期: 上传成功，显示 SHA256 校验值

6. 认证管理
   认证管理 → 新建认证 → 设置到期日期
   预期: 到期前系统自动发送飞书提醒
```

### 8.3 飞书集成验证

| 检查项 | 验证方法 |
|--------|---------|
| 工作台可见 | 飞书→工作台→搜索"纳研PDM" |
| SSO 登录 | 点击应用→扫码→进入系统 |
| 审批通知 | 创建项目→飞书收到审批卡片 |
| 审批回调 | 在飞书审批通过→系统状态更新 |
| 消息通知 | 分配任务→被分配人收到飞书消息 |
| 任务同步 | 创建WBS任务→飞书任务中心可见 |
| 日历同步 | 设置里程碑→飞书日历可见 |

---

## 9. 生产加固

### 9.1 数据库备份

```bash
# 添加定时备份 (crontab -e)
0 2 * * * docker compose -f /opt/pdm/docker-compose.yml exec -T postgres pg_dump -U pdm pdm | gzip > /backup/pdm_$(date +\%Y\%m\%d).sql.gz
# 保留最近 30 天
0 3 * * * find /backup -name "pdm_*.sql.gz" -mtime +30 -delete
```

### 9.2 日志管理

`docker-compose.yml` 已包含日志轮转配置（单文件 100MB，保留 3 个）。

### 9.3 监控

```bash
# 推荐安装 Uptime Kuma (免费)
docker run -d --name uptime-kuma -p 3001:3001 -v uptime-kuma:/app/data louislam/uptime-kuma:1

# 配置监控:
#  - https://pdm.anari.com/api/health  (API 存活)
#  - https://pdm.anari.com              (前端可访问)
```

### 9.4 自动重启

`docker-compose.yml` 已配置 `restart: unless-stopped`，服务异常退出会自动重启。

### 9.5 防火墙

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
# 5432、6379、9000 等内部端口不对外开放
```

---

## 10. 常见问题

### Q1: 扫码登录后无法回到系统？

检查飞书开放平台「安全设置」→「重定向 URL」是否包含你的域名。
同时确认 `.env` 中 `FEISHU_REDIRECT_URI` 与白名单一致。

### Q2: 审批创建失败 (错误码 60011)？

检查 `.env` 中 `FEISHU_APP_ID` / `FEISHU_APP_SECRET` 是否正确。
检查审批能力是否已添加并发布。

### Q3: 审批通过后系统状态没更新？

检查事件订阅 URL 是否可被飞书访问。
检查 `.env` 中 `FEISHU_ENCRYPT_KEY` 是否与开放平台一致。

验证回调是否可达：
```bash
curl -X POST https://pdm.anari.com/api/v1/callbacks/feishu/event \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}'
# 应返回: {"challenge":"test123"}
```

### Q4: 收不到机器人消息？

用户需要在飞书端先搜索「纳研助手」机器人名称并打开对话窗口。
首次交互后，系统才能向该用户发送消息。

### Q5: 数据库连接失败？

```bash
# 检查 PostgreSQL 容器
docker compose ps postgres
docker compose logs postgres | tail -20

# 确认 .env 中 DATABASE_URL 正确
# 容器间通信用服务名 "postgres" 而非 "localhost"
```

### Q6: 健康检查返回 database: unavailable？

PostgreSQL 可能还在启动中，等待 10-30 秒后重试。
如果持续不可用，检查 `DATABASE_URL` 和数据库容器日志。

### Q7: 员工无法在飞书工作台看到应用？

检查「版本管理与发布」→ 应用是否「已发布」。
检查可用范围是否包含该员工。
发布后可能需要 1-5 分钟生效。

---

## 11. 附录

### 11.1 快速部署命令汇总

```bash
# 完整部署流程（复制粘贴执行）
git clone https://gitee.com/anari-energy/product_develop_management.git /opt/pdm
cd /opt/pdm
cp .env.example .env
# 编辑 .env (vim .env) — 填入所有密钥和飞书凭证
docker compose up -d --build
docker compose exec backend alembic upgrade head
curl http://localhost:8000/api/health
```

### 11.2 更新部署

```bash
cd /opt/pdm
git pull
docker compose up -d --build
docker compose exec backend alembic upgrade head
```

### 11.3 系统安全特性

本系统已通过完整的架构审查和安全加固（2026-06-12）：

| 安全特性 | 说明 |
|---------|------|
| 密钥管理 | 全部从环境变量读取，无硬编码 |
| JWT | access + refresh token，支持轮转和黑名单 |
| 签名验证 | HMAC-SHA256 验证飞书回调 |
| 速率限制 | /refresh 接口 5 次/分钟/IP |
| 审计日志 | 独立事务，不受业务回滚影响 |
| 错误处理 | 不泄露内部信息给客户端 |
| 文件上传 | 固件 50MB 限制 |

### 11.4 系统能力矩阵

| 功能模块 | 状态 |
|---------|------|
| 产品管理 (CRUD + 生命周期) | ✅ |
| 项目管理 (WBS + Issue) | ✅ |
| 设计文件 (版本管理 + MinIO) | ✅ |
| 供应商管理 (资质 + 外包) | ✅ |
| 认证管理 (到期提醒) | ✅ |
| 固件 OTA (版本 + 灰度) | ✅ |
| 数据分析 Dashboard | ✅ |
| 系统管理 (用户 + 审计) | ✅ |
| 飞书 SSO 登录 | ✅ |
| 飞书审批工作流 | ✅ |
| 飞书消息机器人 | ✅ |
| 飞书任务同步 | ✅ |
| 飞书日历同步 | ✅ |

---

> **最后更新:** 2026-06-12
> **技术支持:** Dylan | dylan@anari-energy.com
