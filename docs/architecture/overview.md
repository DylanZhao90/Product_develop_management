# PLM 产品生命周期管理系统架构设计

## 1. 项目概述

**Product Lifecycle Management (PLM)** — 面向硬件产品（充电桩等）的全生命周期管理平台，覆盖从立项、研发、认证、量产到退市的完整流程，集成飞书协作。

| 维度 | 说明 |
|------|------|
| 目标用户 | PM、硬件工程师、结构设计师、认证专员、供应商 |
| 业务领域 | 充电桩/便携式充电器 产品全生命周期管理 |
| 核心集成 | 飞书 (SSO/审批/消息/任务/日历) |
| 系统定位 | **纯产品生命周期管理**，不包含生产执行(MES)、物料库存(ERP)、售后工单(CRM) |

---

## 2. 技术栈

```
┌─────────────────────────────────────────────────┐
│                    Frontend                      │
│  React 18 + TypeScript + Vite                   │
│  Ant Design 5 + Pro Components                  │
│  Zustand (state) + React Query (server state)   │
│  ECharts (charts) + react-intl (i18n)           │
├─────────────────────────────────────────────────┤
│                    Backend                       │
│  FastAPI (Python 3.12+) + Uvicorn               │
│  SQLAlchemy 2.0 async + Alembic                 │
│  Pydantic v2 (validation) + JWT (auth)          │
├─────────────────────────────────────────────────┤
│                 Infrastructure                   │
│  PostgreSQL 16  │  Redis 7  │  MinIO (S3)       │
│  Docker Compose (dev)  │  K8s (prod target)     │
└─────────────────────────────────────────────────┘
```

---

## 3. 系统架构图

```
                    ┌──────────┐
                    │  Nginx   │  ← TLS termination, reverse proxy
                    └────┬─────┘
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐
      │ Frontend │ │ Backend  │ │  MinIO   │
      │  (SPA)   │ │  :8000   │ │  :9000   │
      └──────────┘ └───┬──────┘ └──────────┘
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐
      │PostgreSQL│ │  Redis   │ │ External │
      │  :5432   │ │  :6379   │ │   APIs   │
      └──────────┘ └──────────┘ └────┬─────┘
                                     │
                                     ▼
                              ┌──────────┐
                              │  Feishu  │
                              │ Open API │
                              └──────────┘
```

---

## 4. 后端分层架构

```
api/v1/          ← HTTP 路由层 (10 个模块)
    │
services/        ← 业务逻辑层 (9 service)
    │
repositories/    ← 数据访问层 (SQLAlchemy async queries)
    │
models/          ← ORM 模型 (12 个核心实体)
    │
schemas/         ← Pydantic 请求/响应模型
    │
core/            ← 基础设施 (config, db, deps, security, event_bus)
integrations/    ← 外部集成 (feishu)
middleware/      ← 横切关注点 (audit, error_handler)
```

### 4.1 路由模块

| 模块 | 前缀 | 说明 |
|------|------|------|
| auth | /api/v1/auth | SSO 登录 + JWT |
| dashboard | /api/v1/dashboard | 聚合统计面板 |
| products | /api/v1/products | 产品 CRUD + 生命周期流转 |
| projects | /api/v1/projects | 项目 CRUD + WBS 任务 + 技术 Issue |
| design | /api/v1/design-files | 设计文件版本管理 |
| suppliers | /api/v1/suppliers | 供应商 + 外包任务管理 |
| firmware | /api/v1/firmware | 固件版本 + OTA 任务 |
| analytics | /api/v1/analytics | 产品/项目/任务/Issue 统计 |
| callbacks | /api/v1/callbacks/feishu | 飞书审批回调 + 事件订阅 |
| admin | /api/v1/admin | 用户管理 + 审计日志 |

---

## 5. 数据模型

### 5.1 核心实体关系

```
User ─────────────────────────────────────────────┐
  │ (product_manager_id)                          │
  ▼                                               │
Product ──┬── LifecycleChangeLog                  │
  │       ├── DesignFile                          │
  │       ├── Certification                       │
  │       └── Project                             │
  │                                               │
  └── Project ──┬── ProjectTask (WBS 树)          │
                ├── TechnicalIssue                │
                └── OutsourceTask → Supplier      │
                                                   │
FirmwareVersion ── FirmwareUpgradeTask
```

### 5.2 关键状态机

**产品生命周期:**
```
in_development → trial_handover → on_sale → discontinued → eol
       ↑______________│
```

**项目状态:**
```
pending_approval → approved → in_progress → completed → closed
```

**任务状态:** `pending → in_progress → completed | blocked`

---

## 6. 认证与权限

```
飞书 OAuth 2.0 → 换取 user_info → JWT (access + refresh token)
                                    │
                                    ▼
                          Bearer Token → get_current_user()
                                          │
                                   ┌──────┴──────┐
                                   │  RBAC 角色   │
                                   │ admin | pm  │
                                   │ designer    │
                                   │ engineer    │
                                   │ supplier    │
                                   │ cert_spec   │
                                   └─────────────┘
```

---

## 7. 飞书集成设计

| 能力 | 说明 |
|------|------|
| SSO 登录 | OAuth code → user info → JWT |
| 审批 | 创建审批实例 + 回调处理 + 状态联动 |
| 消息机器人 | 卡片消息/文本消息，任务分配、逾期催办、认证到期通知 |
| 任务同步 | 飞书任务中心同步 WBS 任务 |
| 日历同步 | 项目里程碑同步到飞书日历 |

---

## 8. 事件总线

解耦业务逻辑与通知，预定义事件:

| 事件 | 触发时机 |
|------|---------|
| `task.overdue` | 任务逾期 |
| `task.assigned` | 任务分配 |
| `certification.expiring` | 认证即将到期 |
| `approval.approved` / `approval.rejected` | 审批结果 |
| `product.discontinued` | 产品停产 |
| `firmware.upgrade_completed` | OTA 完成 |

---

## 9. 文件存储

使用 MinIO (S3 兼容):
- **设计文件:** `design-files/{product_id}/{version}/{filename}`
- **固件文件:** `firmware/{product_model}/{version}/firmware.bin`
- **认证文件:** `certifications/{product_id}/{cert_type}/`

---

## 10. 前端路由

| 路径 | 页面 | 说明 |
|------|------|------|
| /login | 飞书登录 | SSO 入口 |
| /auth/callback | OAuth 回调 | 飞书回调处理 |
| / | Dashboard | 产品/项目/任务统计面板 |
| /products | 产品列表 | 产品 CRUD |
| /products/:id | 产品详情 | 生命周期 + 关联项目 |
| /projects | 项目列表 | 项目卡片视图 |
| /projects/:id | 项目详情 | WBS + Issue + 飞书审批 |
| /design | 设计文件管理 | 版本管理 + MinIO |
| /suppliers | 供应商管理 | CRUD + 外包任务 |
| /lifecycle | 生命周期管理 | 产品状态流转 |
| /firmware | 固件 OTA | 版本 + 灰度发布 |
| /analytics | 数据分析 | 产品/项目/任务/Issue 统计 |
| /admin | 系统管理 | 用户管理 + 审计 |
| /settings | 设置 | 语言/偏好 |

---

## 11. 系统边界

```
┌────────────────────────────────────────────────┐
│               PLM 系统边界                      │
│                                                │
│  系统负责:              外部系统负责:            │
│  ─────────              ────────────            │
│  ✅ 产品档案 & 生命周期   ❌ 售后工单 (CRM)       │
│  ✅ 研发项目管理 (WBS)    ❌ SN 追溯 (MES)       │
│  ✅ 设计文件版本控制      ❌ 物料库存 (ERP)       │
│  ✅ 供应商 & 外包管理     ❌ 生产排程 (MES)       │
│  ✅ 认证合规 & 到期管理   ❌ 财务结算 (ERP)       │
│  ✅ 固件版本 & OTA 发布   ❌ 客户关系 (CRM)       │
│  ✅ 研发数据分析          ❌ 设备远程诊断 (IoT)   │
│  ✅ 飞书协作集成                                │
│                                                │
│  PLM 聚焦: 产品从"想法"到"退市"的全生命周期管理   │
└────────────────────────────────────────────────┘
```
