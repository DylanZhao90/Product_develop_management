# PDM 飞书部署上架完整指南（详细版）

> Product Development & Lifecycle Management — 企业内部飞书应用部署
> 最后更新: 2026-06-12 | 版本: 0.2.0

---

## 目录

1. [整体架构](#1-整体架构)
2. [第一步：购买阿里云 ECS 服务器](#2-第一步购买阿里云-ecs-服务器)
3. [第二步：配置阿里云 DNS 域名解析](#3-第二步配置阿里云-dns-域名解析)
4. [第三步：SSH 登录服务器并安装基础软件](#4-第三步ssh-登录服务器并安装基础软件)
5. [第四步：克隆代码并生成密钥](#5-第四步克隆代码并生成密钥)
6. [第五步：配置 .env 环境变量](#6-第五步配置-env-环境变量)
7. [第六步：启动 Docker 容器](#7-第六步启动-docker-容器)
8. [第七步：配置 Nginx 反向代理与 HTTPS](#8-第七步配置-nginx-反向代理与-https)
9. [第八步：初始化数据库](#9-第八步初始化数据库)
10. [第九步：飞书开放平台配置](#10-第九步飞书开放平台配置)
11. [第十步：验证测试](#11-第十步验证测试)
12. [第十一步：生产加固](#12-第十一步生产加固)
13. [第十二步：发布上线](#12-第十二步发布上线)
14. [常见问题排错](#13-常见问题排错)
15. [附录：快速命令汇总](#14-附录快速命令汇总)

---

## 1. 整体架构

### 1.1 部署后的最终效果

```
员工手机打开飞书 → 工作台 → 点「纳研PDM」→ 浏览器打开系统
                                              ↓
                              https://pdm.anari.com (阿里云服务器)
```

```
┌─────────────────────────────────────────────────────────────┐
│                      阿里云 ECS 服务器                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Nginx (:443)  ← HTTPS 加密 + 反向代理               │  │
│  │    /             → Frontend (:3000)                  │  │
│  │    /api/         → Backend  (:8000)                  │  │
│  │    /files/       → MinIO    (:9000)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Frontend │  │ Backend  │  │  MinIO   │                 │
│  │ React SPA│  │ FastAPI  │  │ 对象存储  │                 │
│  │  :3000   │  │  :8000   │  │  :9000   │                 │
│  └──────────┘  └────┬─────┘  └──────────┘                 │
│                     │                                       │
│          ┌──────────┼──────────┐                           │
│          ▼          ▼          ▼                           │
│    ┌──────────┐ ┌──────────┐ ┌──────────────┐             │
│    │PostgreSQL│ │  Redis   │ │  飞书 Open   │             │
│    │  :5432   │ │  :6379   │ │     API      │             │
│    └──────────┘ └──────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 域名规划

| 域名 | 用途 | 说明 |
|------|------|------|
| `pdm.anari.com` | 系统访问入口 + API | 员工浏览器访问、飞书回调 |

---

## 2. 第一步：购买阿里云 ECS 服务器

> 如果公司已有可用的阿里云服务器，跳过这一步，直接进入第二步。

### 2.1 登录阿里云控制台

```
1. 浏览器打开 https://www.aliyun.com
2. 点击右上角「登录」
3. 使用公司阿里云主账号或 RAM 子账号登录
4. 登录后进入「阿里云管理控制台」
```

### 2.2 创建 ECS 实例

```
1. 控制台顶部搜索框输入「ECS」，点击「云服务器 ECS」
2. 点击左侧菜单「实例」
3. 点击右上角「创建实例」

4. 在创建页面，按以下参数填写：

   ┌─────────────────────────────────────────────────────────┐
   │ 参数                  │ 选择值                          │
   ├─────────────────────────────────────────────────────────┤
   │ 付费方式              │ 包年包月 (如需长期使用)          │
   │                       │ 或 按量付费 (测试用)             │
   │ 地域                  │ 选择离公司最近的 (如 华东1杭州)   │
   │ 网络及可用区          │ 默认即可                        │
   │ 实例规格              │ 建议: ecs.c6.xlarge (4C8G)      │
   │                       │ 最低: ecs.c6.large (2C4G)       │
   │ 镜像                  │ Ubuntu 22.04 64位               │
   │ 系统盘                │ 高效云盘 100GB                  │
   │ 公网 IP               │ ✅ 分配公网 IPv4 地址           │
   │ 带宽计费              │ 按固定带宽, 5Mbps               │
   │ 登录凭证              │ ○ 自定义密码                   │
   │ 登录密码              │ 输入密码 (至少8位，含大小写+数字)│
   │ 实例名称              │ pdm-server                      │
   └─────────────────────────────────────────────────────────┘

5. 其他选项保持默认，点击右下角「确认订单」
6. 勾选「同意服务条款」，点击「去支付」
7. 支付完成后，点击「管理控制台」返回实例列表
```

### 2.3 查看服务器公网 IP

```
1. 等待实例状态变为「运行中」(约 1-3 分钟)
2. 点击实例 ID，进入实例详情
3. 在「实例信息」区域找到「公网 IP」
4. 把这个 IP 记录下来，格式如: 47.96.xxx.xxx
```

### 2.4 配置安全组（防火墙规则）

```
1. 在实例详情页，点击「安全组」标签
2. 点击安全组 ID，进入安全组详情
3. 点击「入方向」→「手动添加」

   逐条添加以下规则：

   ┌──────────┬──────────┬──────────────┬──────────────────┐
   │ 优先级   │ 协议类型  │ 端口范围      │ 授权对象          │
   ├──────────┼──────────┼──────────────┼──────────────────┤
   │ 1        │ TCP      │ 22/22        │ 0.0.0.0/0 (SSH) │
   │ 1        │ TCP      │ 80/80        │ 0.0.0.0/0 (HTTP)│
   │ 1        │ TCP      │ 443/443      │ 0.0.0.0/0 (HTTPS)│
   └──────────┴──────────┴──────────────┴──────────────────┘

   注意: 5432 (PostgreSQL)、6379 (Redis)、9000 (MinIO) 不要开放！
         这些端口只在服务器内部通信，不必暴露到公网。

4. 点击「保存」
```

---

## 3. 第二步：配置阿里云 DNS 域名解析

> 前提：公司已有域名（如 `anari.com`）托管在阿里云 DNS，且账号有管理权限。

### 3.1 进入 DNS 解析控制台

```
1. 阿里云控制台顶部搜索框输入「DNS」，点击「云解析 DNS」
2. 在域名列表中找到 anari.com (或公司自己的域名)
3. 点击域名右边的「解析设置」
```

### 3.2 添加 A 记录

```
1. 点击「添加记录」按钮

2. 填写以下信息：

   ┌─────────────────────────────────────────────────────────┐
   │ 记录类型:    A                                          │
   │ 主机记录:    pdm                                        │
   │   (这表示创建 pdm.anari.com 这个子域名)                  │
   │                                                         │
   │ 解析线路:    默认                                       │
   │ 记录值:      47.96.xxx.xxx  (你的服务器公网 IP)          │
   │ TTL:        600 (10分钟)                                │
   └─────────────────────────────────────────────────────────┘

3. 点击「确定」
```

### 3.3 验证 DNS 解析是否生效

> 注意：DNS 解析生效需要 1-10 分钟。可以等后续步骤完成后再验证。

```bash
# 在你的本地电脑上运行 (不是在服务器上)
ping pdm.anari.com

# 看到类似输出说明解析成功:
# 64 bytes from 47.96.xxx.xxx: icmp_seq=1 ttl=64 time=5.23 ms
```

> 如果 ping 不通：回到阿里云 ECS 安全组，确认 ICMP 协议已开放（或不用 ping，直接用 `nslookup pdm.anari.com` 检查 DNS 是否指向正确 IP）。

---

## 4. 第三步：SSH 登录服务器并安装基础软件

### 4.1 SSH 登录

在你的本地电脑（Mac/Linux 用终端，Windows 用 PowerShell 或 Putty）上：

```bash
# 替换 <服务器IP> 为你的服务器公网 IP
ssh root@<服务器IP>

# 示例:
ssh root@47.96.123.456
```

首次登录会提示：

```
The authenticity of host '47.96.123.456' can't be established.
Are you sure you want to continue connecting (yes/no)?
```

输入 `yes` 并回车。然后输入创建服务器时设置的密码。

### 4.2 更新系统包

```bash
# 登录后先更新系统包列表
apt update

# 看到类似输出:
# Get:1 http://mirrors.cloud.aliyuncs.com/ubuntu jammy InRelease [270 kB]
# ...

# 升级所有已安装的包
apt upgrade -y

# 看到类似输出:
# The following packages will be upgraded:
#   openssh-server python3 ...
# 等待完成 (约 2-5 分钟)
```

### 4.3 安装 Docker

```bash
# 下载并执行 Docker 官方安装脚本
curl -fsSL https://get.docker.com | bash

# 看到类似输出:
# Executing docker install script
# ...
# Docker installed successfully

# 把当前用户 (root) 加入 docker 组 (可免 sudo 运行 docker)
usermod -aG docker root

# 验证 Docker 是否安装成功
docker --version

# 预期输出:
# Docker version 26.1.4, build 5650f9b
```

### 4.4 安装 Docker Compose

```bash
# 安装 Docker Compose 插件
apt install docker-compose-plugin -y

# 验证
docker compose version

# 预期输出:
# Docker Compose version v2.27.1
```

### 4.5 安装 Nginx 和 Certbot

```bash
# 安装 Nginx
apt install nginx -y

# 安装 Certbot (用于免费 HTTPS 证书)
apt install certbot python3-certbot-nginx -y

# 验证 Nginx 是否运行
systemctl status nginx

# 预期看到:
# Active: active (running)
```

### 4.6 安装 Git

```bash
# 安装 Git
apt install git -y

# 验证
git --version

# 预期输出:
# git version 2.34.1
```

---

## 5. 第四步：克隆代码并生成密钥

### 5.1 创建项目目录

```bash
# 创建项目根目录
mkdir -p /opt/pdm

# 进入项目目录
cd /opt/pdm

# 确认当前目录
pwd
# 预期输出:
# /opt/pdm
```

### 5.2 从 Gitee 克隆代码

```bash
# 克隆代码仓库
git clone https://gitee.com/anari-energy/product_develop_management.git .

# 注意末尾的「 . 」表示克隆到当前目录 (/opt/pdm)

# 看到类似输出:
# Cloning into '.'...
# remote: Enumerating objects: 423, done.
# remote: Counting objects: 100% (423/423), done.
# Receiving objects: 100% (423/423), 1.23 MiB | 2.45 MiB/s, done.

# 查看克隆的文件
ls -la

# 预期看到:
# backend/  frontend/  docs/  docker-compose.yml  Makefile  .env.example
```

### 5.3 生成所有密钥

**重要：这一步生成的每个密钥都必须保存下来。可以用记事本临时记录，后续填入 .env 文件。**

```bash
# 1. 生成 JWT 签名密钥 (32 字节随机数据)
openssl rand -hex 32

# 示例输出:
# 4a7b2c9d1e3f5a8b6c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4
# 把这一长串复制保存，这就是你的 SECRET_KEY
```

```bash
# 2. 生成数据库密码 (24 位随机字符串)
openssl rand -base64 24

# 示例输出:
# Xk9mP2vL7qR4nT8wB3cF6hJ1
# 这就是你的 DATABASE_PASSWORD
```

```bash
# 3. 生成 Redis 密码
openssl rand -base64 16

# 示例输出:
# a3Bf7KpQ9xR2mZ6
# 这就是你的 REDIS_PASSWORD
```

```bash
# 4. 生成 MinIO Access Key (用户名)
openssl rand -hex 16

# 示例输出:
# 7a3b5c2d9e1f4a6b
# 这就是你的 MINIO_ACCESS_KEY
```

```bash
# 5. 生成 MinIO Secret Key (密码)
openssl rand -hex 16

# 示例输出:
# c8d2e4f6a8b0c2d4
# 这就是你的 MINIO_SECRET_KEY
```

---

## 6. 第五步：配置 .env 环境变量

### 6.1 复制模板文件

```bash
cd /opt/pdm

# 复制模板
cp .env.example .env

# 确认文件已创建
ls -la .env

# 预期输出:
# -rw-r--r-- 1 root root 2048 Jun 12 12:00 .env
```

### 6.2 编辑 .env 文件

```bash
# 使用 vim 或 nano 编辑
nano .env
```

完整的 `.env` 文件内容（**把 `<...>` 替换为前面生成的密钥**）：

```bash
# ==========================================
# 应用配置
# ==========================================
APP_NAME=纳研PDM
ENVIRONMENT=production
DEBUG=false

# 第 5.3 节第 1 步生成的 64 位字符串
SECRET_KEY=4a7b2c9d1e3f5a8b6c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4

# ==========================================
# 数据库
# ==========================================
# 注意：密码中的特殊字符可能需要在 URL 中编码
DATABASE_URL=postgresql+asyncpg://pdm:Xk9mP2vL7qR4nT8wB3cF6hJ1@postgres:5432/pdm
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10
POSTGRES_USER=pdm
POSTGRES_PASSWORD=Xk9mP2vL7qR4nT8wB3cF6hJ1
POSTGRES_DB=pdm

# ==========================================
# Redis
# ==========================================
REDIS_URL=redis://:a3Bf7KpQ9xR2mZ6@redis:6379/0

# ==========================================
# MinIO (文件存储)
# ==========================================
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=7a3b5c2d9e1f4a6b
MINIO_SECRET_KEY=c8d2e4f6a8b0c2d4
MINIO_BUCKET=pdm-prod
MINIO_SECURE=false
MINIO_ROOT_USER=7a3b5c2d9e1f4a6b
MINIO_ROOT_PASSWORD=c8d2e4f6a8b0c2d4

# ==========================================
# 飞书开放平台凭证 (第九步获取后填入)
# ==========================================
# 暂时留空，等飞书应用配置完成后填入
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_ENCRYPT_KEY=
FEISHU_BASE_URL=https://open.feishu.cn/open-apis
FEISHU_REDIRECT_URI=https://pdm.anari.com/auth/callback
FEISHU_VERIFICATION_TOKEN=

# ==========================================
# CORS
# ==========================================
CORS_ORIGINS=["https://pdm.anari.com","http://localhost:3000","http://localhost:5173"]

# ==========================================
# JWT
# ==========================================
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# ==========================================
# 分页
# ==========================================
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
```

### 6.3 保存并退出

```
nano 编辑器:
  按 Ctrl+O  (保存)
  按 Enter   (确认文件名)
  按 Ctrl+X  (退出)

vim 编辑器:
  按 Esc
  输入 :wq
  按 Enter
```

### 6.4 验证 .env 文件正确性

```bash
# 检查 SECRET_KEY 是否已填写 (不应为空)
grep SECRET_KEY .env
# 预期输出:
# SECRET_KEY=4a7b2c9d1e3f5a8b6c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4

# 确认没有遗漏的 <...> 占位符
grep "<" .env
# 预期输出: 空 (没有任何 <xxx> 占位符)
```

---

## 7. 第六步：启动 Docker 容器

### 7.1 构建并启动所有服务

```bash
cd /opt/pdm

# 启动所有容器 (首次需要构建镜像，约 3-5 分钟)
docker compose up -d --build

# 看到类似输出:
# [+] Building 120.5s (15/15) FINISHED
# [+] Running 5/5
#  ✔ Container pdm-postgres  Started
#  ✔ Container pdm-redis     Started
#  ✔ Container pdm-minio     Started
#  ✔ Container pdm-backend   Started
#  ✔ Container pdm-frontend  Started
```

### 7.2 检查容器状态

```bash
docker compose ps

# 预期输出 (STATUS 列全部为 Up):
# NAME            STATUS          PORTS
# pdm-postgres    Up 2 minutes    0.0.0.0:5432->5432/tcp
# pdm-redis       Up 2 minutes    0.0.0.0:6379->6379/tcp
# pdm-minio       Up 2 minutes    0.0.0.0:9000-9001->9000-9001/tcp
# pdm-backend     Up 1 minute     0.0.0.0:8000->8000/tcp
# pdm-frontend    Up 1 minute     0.0.0.0:3000->3000/tcp
```

### 7.3 查看后端日志 (排查启动问题)

```bash
# 查看后端启动日志
docker compose logs backend --tail=30

# 预期看到:
# INFO:     Started server process [1]
# INFO:     Waiting for application startup.
# INFO:     Application startup complete.
# INFO:     Uvicorn running on http://0.0.0.0:8000

# 如果看到 ERROR，说明 .env 配置有问题
# 常见错误: SECRET_KEY not set → 回到第六步检查 .env
```

### 7.4 测试 API 健康检查

```bash
# 服务器本地测试
curl http://localhost:8000/api/health

# 预期输出:
# {"status":"ok","database":"ok","version":"0.2.0","environment":"production"}

# 如果返回:
# {"status":"degraded","database":"unavailable"}
# → PostgreSQL 还没完全启动，等 10 秒后重试
```

### 7.5 测试前端是否运行

```bash
curl -I http://localhost:3000

# 预期输出:
# HTTP/1.1 200 OK
# Content-Type: text/html
```

---

## 8. 第七步：配置 Nginx 反向代理与 HTTPS

### 8.1 创建 Nginx 配置文件

```bash
# 创建配置文件
nano /etc/nginx/sites-available/pdm
```

将以下内容完整复制粘贴到文件中（**把 `pdm.anari.com` 替换为你的实际域名**）：

```nginx
# HTTP → 先让 HTTP 能访问，后面会自动升级到 HTTPS
server {
    listen 80;
    server_name pdm.anari.com;

    # 固件文件上传限制 100MB
    client_max_body_size 100m;

    # ========== 前端 SPA ==========
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SPA 路由支持 (刷新不 404)
        proxy_intercept_errors on;
        error_page 404 = @fallback;
    }

    location @fallback {
        proxy_pass http://127.0.0.1:3000/index.html;
        proxy_set_header Host $host;
    }

    # ========== 后端 API ==========
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # ========== MinIO 文件 ==========
    location /files/ {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

保存退出 (nano: `Ctrl+O` → `Enter` → `Ctrl+X`)

### 8.2 启用站点配置

```bash
# 创建符号链接以启用该站点
ln -s /etc/nginx/sites-available/pdm /etc/nginx/sites-enabled/

# 删除默认站点 (避免冲突)
rm -f /etc/nginx/sites-enabled/default

# 检查 Nginx 配置语法
nginx -t

# 预期输出:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 8.3 重载 Nginx

```bash
systemctl reload nginx
```

### 8.4 申请免费 HTTPS 证书 (Let's Encrypt)

> ⚠️ 前提条件: DNS 解析已生效（第二步），`pdm.anari.com` 已指向服务器 IP。
> 可以先用 `ping pdm.anari.com` 确认。

```bash
# 运行 Certbot 自动获取并配置 HTTPS 证书
certbot --nginx -d pdm.anari.com

# 交互步骤:
# 1. 输入你的邮箱 (用于证书到期提醒):
#    例如: dylan@anari-energy.com
#    按 Enter

# 2. 同意服务条款:
#    输入: A
#    按 Enter

# 3. 是否接收电子新闻:
#    输入: N
#    按 Enter

# 等待约 10 秒，看到:
# Congratulations! Your certificate has been saved.
# Deploying certificate
# Successfully deployed certificate for pdm.anari.com

# 你的 Nginx 配置已被自动添加 HTTPS 设置。
```

### 8.5 验证 HTTPS 访问

```bash
# 从服务器本地测试 HTTPS
curl -I https://pdm.anari.com

# 预期输出:
# HTTP/2 200
# server: nginx

# 测试 API
curl https://pdm.anari.com/api/health

# 预期输出:
# {"status":"ok","database":"ok","version":"0.2.0","environment":"production"}
```

---

## 9. 第八步：初始化数据库

### 9.1 执行数据库迁移

```bash
cd /opt/pdm

# 在 backend 容器内运行 alembic 迁移
docker compose exec backend alembic upgrade head

# 预期输出:
# INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
# INFO  [alembic.runtime.migration] Will assume transactional DDL.
# INFO  [alembic.runtime.migration] Running upgrade  -> 001, initial migration
```

### 9.2 验证表是否创建成功

```bash
docker compose exec backend python3 -c "
from app.core.database import Base, engine, async_session
from app.models import *
import asyncio

async def check():
    async with engine.begin() as conn:
        from sqlalchemy import text
        result = await conn.execute(text('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\' ORDER BY tablename'))
        tables = [row[0] for row in result.fetchall()]
        print('Tables found:', len(tables))
        for t in tables:
            print(f'  ✅ {t}')

asyncio.run(check())
"

# 预期输出:
# Tables found: 14
#   ✅ alembic_version
#   ✅ audit_logs
#   ✅ certifications
#   ✅ design_files
#   ✅ firmware_upgrade_tasks
#   ✅ firmware_versions
#   ✅ lifecycle_change_logs
#   ✅ outsource_tasks
#   ✅ products
#   ✅ project_tasks
#   ✅ projects
#   ✅ suppliers
#   ✅ technical_issues
#   ✅ users
```

如果看到 14 张表（含 alembic_version），说明数据库初始化成功。

---

## 10. 第九步：飞书开放平台配置

> 以下所有操作在浏览器中完成，登录 https://open.feishu.cn
> 耗时约 30 分钟。**请用飞书企业管理员账号登录。**

### 10.1 登录飞书开放平台

```
1. 浏览器打开 https://open.feishu.cn
2. 点击右上角「登录」
3. 选择「企业账号登录」
4. 在弹出的飞书授权页面点击「授权」
5. 登录成功后进入「飞书开放平台」首页
```

### 10.2 创建企业自建应用

```
1. 在开放平台首页，点击顶部导航栏的「开发者后台」

2. 进入开发者后台后，点击右上角「创建企业自建应用」

3. 弹窗中填写：
   ┌─────────────────────────────────────┐
   │ 应用名称:  纳研PDM                    │
   │                                     │
   │ 应用描述:  安纳瑞能源产品研发管理平台   │
   │           覆盖产品立项、研发、认证、    │
   │           量产、退市全流程             │
   │                                     │
   │ 应用图标:  点击上传 → 选择公司 logo     │
   │            (推荐 512x512 方形 PNG)    │
   │                                     │
   │ 应用类型:  企业自建应用                │
   └─────────────────────────────────────┘

4. 点击「确定创建」
5. 页面自动跳转到应用详情页
```

### 10.3 获取应用凭证

```
1. 在应用详情页，左侧菜单点击「凭证与基础信息」

2. 页面显示三个关键信息，现在逐一复制保存：

   ┌──────────────────────────────────────────────────────┐
   │                                                      │
   │  App ID:    cli_a1b2c3d4e5f6g7h8                     │
   │  说明: 应用的唯一标识                                  │
   │  操作: 点击右侧「复制」图标 → 临时粘贴到记事本           │
   │  对应 .env: FEISHU_APP_ID                            │
   │                                                      │
   │  App Secret:  ********(点击"查看"按钮显示)              │
   │  说明: 应用的密钥，仅显示一次！                         │
   │  操作: 点击「查看」→ 复制 → 粘贴到记事本                │
   │  ⚠️  如果页面刷新后看不到 App Secret:                  │
   │      点击「重置」重新生成一个                           │
   │  对应 .env: FEISHU_APP_SECRET                        │
   │                                                      │
   │  Encrypt Key:  默认未生成                             │
   │  说明: 事件订阅的加密密钥                              │
   │  操作: 点击右侧「启用」→「生成」→ 复制                   │
   │  对应 .env: FEISHU_ENCRYPT_KEY                       │
   │                                                      │
   └──────────────────────────────────────────────────────┘
```

> ⚠️ **非常重要：把这三个值保存到记事本，不要丢失。**
> App Secret 只显示一次，丢失后只能重置重新生成。

### 10.4 配置网页应用 (SSO 登录)

```
1. 左侧菜单点击「应用能力」

2. 页面中部点击「添加应用能力」按钮

3. 在弹窗中找到「网页应用」，点击右侧「添加」

4. 添加后，在「网页应用」配置区填写：
   ┌──────────────────────────────────────┐
   │ 桌面端主页:                           │
   │ https://pdm.anari.com                │
   │                                      │
   │ 移动端主页:                           │
   │ https://pdm.anari.com                │
   └──────────────────────────────────────┘

5. 点击页面底部的「保存」
```

然后配置 OAuth 重定向 URL（安全白名单）：

```
1. 左侧菜单点击「安全设置」

2. 在「重定向 URL」配置区，添加以下地址 (一行一个):

   https://pdm.anari.com/auth/callback

   如果还需要本地开发调试，追加:
   http://localhost:3000/auth/callback
   http://localhost:5173/auth/callback

3. 点击「保存」

注意: 不要加末尾斜杠，地址必须和实际回调地址完全一致。
```

### 10.5 添加机器人能力 (消息通知)

```
1. 左侧菜单点击「应用能力」
2. 点击「添加应用能力」
3. 找到「机器人」→ 点击「添加」

4. 添加后，在机器人配置区填写：
   ┌──────────────────────────────────────┐
   │ 机器人名称:  纳研助手                  │
   │                                      │
   │ 机器人描述:  PDM 研发任务分配通知、     │
   │             认证到期提醒、项目审批结果   │
   │                                      │
   │ 消息卡片请求网址:  (留空)              │
   └──────────────────────────────────────┘

5. 点击「保存」
```

### 10.6 添加审批能力 (项目审批)

```
1. 左侧菜单点击「应用能力」
2. 点击「添加应用能力」
3. 找到「审批」→ 点击「添加」
4. 点击「保存」
```

然后创建审批定义：

```
1. 在浏览器新标签页打开飞书管理后台:
   https://www.feishu.cn/approval/admin

2. 用同一个小号扫码登录

3. 在审批管理页面，点击「审批管理」→「创建审批」

   如果找不到「审批管理」:
   → 点击左侧「工作台」→「审批」→ 进入后找「审批管理」

4. 创建审批表单:

   ┌──────────────────────────────────────────────┐
   │ 审批名称: 项目立项审批                          │
   │                                              │
   │ 表单设计 (从左边的控件区拖入):                   │
   │                                              │
   │  ┌ 项目名称  [单行文本]  必填                  │
   │  └ 提示文字: 请输入项目名称                     │
   │                                              │
   │  ┌ 产品型号  [单行文本]  选填                  │
   │  └ 提示文字: 关联的产品型号                     │
   │                                              │
   │  ┌ 项目类型  [下拉框]    必填                  │
   │  └ 选项: 新品研发 / 版本升级                   │
   │                                              │
   │  ┌ 可行性文档 [附件]     选填                  │
   │  └ 提示文字: 上传可行性分析报告                 │
   │                                              │
   │  ┌ 项目说明   [多行文本]  选填                  │
   │  └ 提示文字: 项目背景和目标描述                 │
   │                                              │
   │ 审批流程: (根据公司审批链设置)                   │
   │  审批人: 直属上级                              │
   │  抄送人: (可留空)                              │
   └──────────────────────────────────────────────┘

5. 点击右上角「发布」

6. 发布之后，在审批管理列表中，找到刚创建的「项目立项审批」
   点击进入详情，查看 URL 或审批基础信息，
   找到「审批定义 Code」(一串字母数字组合)

7. 如果 Code 不是 PROJECT_REVIEW，记下来，
   然后修改服务器上的代码:
   ssh 登录服务器后:
   nano /opt/pdm/backend/app/integrations/feishu/approval.py
   找到第 16 行附近 "approval_code": 改为你的实际 Code
   修改后: docker compose restart backend
```

### 10.7 配置权限

```
1. 左侧菜单点击「权限管理」

2. 在搜索框中，逐一搜索以下权限并开通:

   ┌──────────────────────────────────────────────────┐
   │ 权限名称                              │ 必须开通  │
   ├──────────────────────────────────────────────────┤
   │ 获取用户基本信息                       │ ✅       │
   │ 获取用户 user_id                      │ ✅       │
   │ 获取用户邮箱信息                       │ ✅       │
   │ 获取用户手机号                         │ ✅       │
   │ 获取通讯录用户信息                     │ ✅       │
   │ 获取企业信息                           │ ✅       │
   │                                    │          │
   │ 审批应用: 创建审批实例                 │ ✅       │
   │ 审批应用: 查看审批实例                 │ ✅       │
   │ 审批应用: 审批任务状态变更             │ ✅       │
   │                                    │          │
   │ 获取与发送单聊消息                     │ ✅       │
   │ 获取与发送群聊消息                     │ ✅       │
   │                                    │          │
   │ 任务: 创建、更新、删除任务             │ ✅       │
   │                                    │          │
   │ 日历: 创建、更新、删除日程             │ ✅       │
   └──────────────────────────────────────────────────┘

   每个权限的操作步骤:
   a. 在搜索框输入权限名称
   b. 点击搜索结果中的权限
   c. 如果权限有「应用身份」和「用户身份」两个开关，
      两个都打开 ✅
   d. 如果权限需要申请，点击「申请开通」

3. 全部添加完成后，点击页面上方的「批量开通」按钮

4. 在弹窗中确认要开通的全部权限，点击「确认」

5. 等待审核 (管理员通常就是自己，即时通过)
```

### 10.8 配置事件订阅 (审批回调)

```
1. 左侧菜单点击「事件订阅」

2. 如果「事件订阅」菜单是灰色的:
   → 先回到「应用能力」确认「审批」能力已添加
   → 或者点击页面中部的「开启事件订阅」开关

3. 在「请求网址」输入框中填写:

   https://pdm.anari.com/api/v1/callbacks/feishu/event

   注意: 必须是 HTTPS，且这个 URL 必须可以被飞书服务器访问。
   如果你的服务器已经完成前面步骤 (Nginx + HTTPS)，
   飞书可以直接访问。

4. 在下方「订阅事件」区域，点击「添加事件」:

   ┌────────────────────────────────────┐
   │ 搜索并添加以下事件:                 │
   │                                    │
   │ ☑ 审批实例状态变更                  │
   │ ☑ 审批任务状态变更                  │
   └────────────────────────────────────┘

5. 点击页面底部「保存」

6. 保存后，飞书会向你的服务器发一个 challenge 验证请求。
   系统已经实现了 challenge 自动应答，所以会立即验证成功。

   如果验证失败，检查:
   - Nginx 和 HTTPS 是否配置正确
   - 防火墙是否开放了 443 端口 (阿里云安全组)
   - 事件订阅 URL 是否可被外网访问
```

### 10.9 发布应用

```
1. 左侧菜单点击「版本管理与发布」

2. 在页面右上角，点击「创建版本」

3. 填写版本信息：
   ┌──────────────────────────────────────┐
   │ 版本号:   1.0.0                       │
   │                                      │
   │ 更新说明:                             │
   │   - 飞书 SSO 扫码登录                 │
   │   - 产品全生命周期管理                 │
   │   - 研发项目管理 (WBS + Issue)        │
   │   - 设计文件版本管理                   │
   │   - 供应商与外包管理                   │
   │   - 认证合规管理                       │
   │   - 固件版本与 OTA 管理               │
   │   - 研发数据 Dashboard                │
   │                                      │
   │ 可用范围: ○ 所有员工                   │
   └──────────────────────────────────────┘

4. 点击「保存」

5. 点击「申请线上发布」

6. 如果审批人是自己 (默认)，即时生效。
   状态变为「已发布」✅
```

### 10.10 将飞书凭证填入服务器 .env

现在回到 SSH 终端，把之前保存的三个飞书凭证填入 `.env`：

```bash
cd /opt/pdm

# 编辑 .env
nano .env

# 找到飞书配置块，填入之前保存的三个值:
# FEISHU_APP_ID=cli_a1b2c3d4e5f6g7h8        ← 从 10.3 节复制
# FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxx    ← 从 10.3 节复制
# FEISHU_ENCRYPT_KEY=xxxxxxxxxxxxxxxxxxxx    ← 从 10.3 节复制

# 保存退出 (Ctrl+O → Enter → Ctrl+X)

# 重启后端容器使新配置生效
docker compose restart backend

# 等待 5 秒后检查
sleep 5
docker compose logs backend --tail=10
# 应该看到 "Application startup complete"，没有 error
```

---

## 11. 第十步：验证测试

### 11.1 飞书 SSO 登录测试

```
1. 在你自己的电脑浏览器上打开: https://pdm.anari.com

   预期: 看到登录页面，有一个「飞书登录」按钮

2. 点击「飞书登录」

   预期: 浏览器跳转到飞书授权页面，URL 以 https://open.feishu.cn 开头

3. 在飞书授权页面，点击「授权」

   预期: 自动跳回 https://pdm.anari.com，进入 Dashboard 首页
         首页显示统计卡片: 活跃产品、活跃项目等

4. 如果跳回后是空白页或报错:
   - SSH 到服务器: docker compose logs backend --tail=30
   - 检查 .env 中 FEISHU_APP_ID 和 FEISHU_APP_SECRET 是否正确
```

### 11.2 创建第一个产品

```
1. 登录系统后，左侧菜单点击「产品管理」
2. 点击右上角「新建产品」按钮
3. 填写:

   ┌──────────────────────────────┐
   │ 产品型号:  AC-Pro-2026       │
   │ 产品名称:  智能交流充电桩Pro  │
   │ 产品类型:  交流充电桩 (AC)    │
   │ 目标市场:  欧盟, 美国        │
   │ 认证需求:  CE, FCC, UL      │
   └──────────────────────────────┘

4. 点击「保存」

   预期: 产品创建成功，自动生成产品编号 (如 AC-2026-0001)
         产品状态显示为「研发中」
```

### 11.3 创建项目并提交审批

```
1. 在刚创建的产品详情页，点击「关联项目」
2. 点击「新建项目」
3. 填写项目名称和类型，点击「提交审批」

   预期: 系统提示"审批已提交"
         在飞书客户端，审批人收到「项目立项审批」通知
```

### 11.4 飞书审批回调验证

```
1. 打开飞书客户端，找到「审批」消息
2. 打开「项目立项审批」→ 点击「通过」

   预期: 回到系统中，项目状态已变为「已通过」

   如果状态没有变化:
   docker compose logs backend --tail=30
   查找 "approval callback" 相关日志
```

### 11.5 消息通知验证

```
1. 创建项目后，进入项目详情 → 任务 → 创建任务
2. 给任务分配一个用户 (输入飞书用户 ID 或从列表选择)

   预期: 被分配人收到飞书消息通知

   注意: 用户必须先在自己的飞书客户端搜索「纳研助手」机器人，
         并打开对话窗口，之后才能收到消息。
```

### 11.6 快速验证清单

| # | 验证项 | 操作 | 预期结果 |
|---|--------|------|---------|
| 1 | HTTPS 可访问 | 浏览器打开 `https://pdm.anari.com` | 显示登录页 |
| 2 | API 健康检查 | `curl https://pdm.anari.com/api/health` | `{"status":"ok","database":"ok"}` |
| 3 | 飞书 SSO 登录 | 点击飞书登录 → 授权 → 回调 | 进入 Dashboard |
| 4 | 飞书工作台可见 | 飞书客户端搜索「纳研PDM」 | 应用出现在工作台 |
| 5 | 创建产品 | 新建产品 → 填写信息 → 保存 | 自动生成编号 |
| 6 | 项目审批 | 创建项目 → 提交审批 → 飞书通过 | 项目状态自动更新 |
| 7 | 消息通知 | 创建任务 → 分配用户 | 用户收到飞书消息 |

---

## 12. 第十一步：生产加固

### 12.1 配置防火墙

```bash
# 只开放必要端口
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# 开启防火墙
ufw enable

# 确认规则
ufw status
# 预期: 22, 80, 443 为 ALLOW
```

### 12.2 数据库自动备份

```bash
# 创建备份目录
mkdir -p /backup

# 添加定时任务
crontab -e

# 在打开的文件中添加以下两行:
0 2 * * * docker compose -f /opt/pdm/docker-compose.yml exec -T postgres pg_dump -U pdm pdm | gzip > /backup/pdm_$(date +\%Y\%m\%d).sql.gz
0 3 * * * find /backup -name "pdm_*.sql.gz" -mtime +30 -delete

# 保存退出 (vim: Esc → :wq → Enter)
```

### 12.3 配置 Docker 自动重启

确认 `docker-compose.yml` 中所有服务都有 `restart: unless-stopped`：

```bash
grep restart /opt/pdm/docker-compose.yml
# 如果没有显示 restart 行，需要手动添加 (当前版本已配置)
```

### 12.4 安装监控 (可选)

```bash
# 安装 Uptime Kuma (开源免费状态监控)
docker run -d \
  --name uptime-kuma \
  --restart unless-stopped \
  -p 3001:3001 \
  -v uptime-kuma-data:/app/data \
  louislam/uptime-kuma:1

# 安装后浏览器打开: http://<服务器IP>:3001
# 添加监控项: https://pdm.anari.com/api/health
```

---

## 13. 第十二步：发布上线

### 13.1 通知团队

```
在飞书群发送通知:

@所有人
纳研PDM 产品研发管理平台已上线 🎉

访问地址: https://pdm.anari.com
登录方式: 飞书扫码登录

主要功能:
📦 产品管理 — 产品档案与生命周期
📋 项目管理 — WBS 任务 + 技术 Issue
🎨 设计协作 — 文件版本管理
🏭 供应商 — 外包任务管理
📜 认证 — 合规到期提醒
📡 固件 — 版本管理与 OTA
📊 分析 — Dashboard 数据看板

使用方式:
1. 飞书工作台搜索「纳研PDM」或浏览器打开链接
2. 飞书扫码登录
3. 开始使用

如有问题联系 @管理员
```

### 13.2 日常维护命令

```bash
# 查看所有容器状态
docker compose -f /opt/pdm/docker-compose.yml ps

# 查看后端日志
docker compose -f /opt/pdm/docker-compose.yml logs backend --tail=50

# 重启所有服务
docker compose -f /opt/pdm/docker-compose.yml restart

# 更新代码
cd /opt/pdm
git pull
docker compose up -d --build
docker compose exec backend alembic upgrade head

# 查看磁盘使用
df -h
docker system df
```

---

## 14. 常见问题排错

### Q1: 浏览器访问域名显示"无法访问此网站"

```
排查步骤:
1. ping pdm.anari.com 看是否返回正确 IP
   → 如果不通，DNS 未生效或阿里云 DNS 配置有误
2. ssh 登录服务器，检查 Nginx 是否运行:
   systemctl status nginx
3. 检查阿里云安全组是否开放了 80/443 端口
4. curl http://localhost:3000 看前端是否运行
```

### Q2: 飞书扫码后无法回到系统

```
排查:
1. 检查飞书开放平台「安全设置」→「重定向 URL」
   是否包含 https://pdm.anari.com/auth/callback
2. 检查 .env 中 FEISHU_REDIRECT_URI 是否一致
3. 检查 Nginx HTTPS 证书是否有效
```

### Q3: 审批通过后系统状态没更新

```
排查:
1. 确认飞书事件订阅配置的 URL 可被外网访问:
   curl -X POST https://pdm.anari.com/api/v1/callbacks/feishu/event \
     -H "Content-Type: application/json" \
     -d '{"type":"url_verification","challenge":"test123"}'
   应返回: {"challenge":"test123"}

2. 检查 .env 中 FEISHU_ENCRYPT_KEY 是否与开放平台一致
3. docker compose logs backend --tail=30
   查找 approval 相关错误日志
```

### Q4: 收不到机器人消息

```
原因: 飞书要求用户必须先和机器人产生「首次对话」

解决:
1. 打开飞书客户端
2. 在顶部搜索框搜索「纳研助手」
3. 点击机器人，进入对话窗口
4. 随便发一句话 (如 "你好")
5. 之后系统才能向该用户发送通知消息
```

### Q5: 数据库连接失败

```bash
# 检查 PostgreSQL 容器是否在运行
docker compose ps postgres

# 查看数据库日志
docker compose logs postgres --tail=20

# 先重启 PostgreSQL
docker compose restart postgres

# 等待 10 秒后重启 backend
sleep 10
docker compose restart backend
```

### Q6: HTTPS 证书过期

```bash
# Certbot 会自动续期。手动续期:
certbot renew

# 查看证书到期时间:
certbot certificates
```

---

## 15. 附录：快速命令汇总

```bash
# ========== 完整部署流程 ==========

# 1. 安装依赖
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | bash
apt install docker-compose-plugin nginx certbot python3-certbot-nginx git -y

# 2. 克隆代码
mkdir -p /opt/pdm && cd /opt/pdm
git clone https://gitee.com/anari-energy/product_develop_management.git .

# 3. 生成密钥 (保存输出!)
openssl rand -hex 32   # SECRET_KEY
openssl rand -base64 24 # DB密码
openssl rand -base64 16 # Redis密码
openssl rand -hex 16   # MinIO AK
openssl rand -hex 16   # MinIO SK

# 4. 配置文件
cp .env.example .env
nano .env  # 填入所有密钥和飞书凭证

# 5. 启动服务
docker compose up -d --build

# 6. Nginx + HTTPS
nano /etc/nginx/sites-available/pdm
ln -s /etc/nginx/sites-available/pdm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d pdm.anari.com

# 7. 初始化数据库
docker compose exec backend alembic upgrade head

# 8. 验证
curl https://pdm.anari.com/api/health
```

---

> **文档版本:** 2.0
> **最后更新:** 2026-06-12
> **技术支持:** Dylan | dylan@anari-energy.com
