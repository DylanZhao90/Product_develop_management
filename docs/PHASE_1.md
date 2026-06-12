# Phase 1 — 核心骨架与基础功能

> **目标:** 搭建项目基础设施，完成认证、产品管理、项目管理三条核心链路
> **状态:** ✅ 已完成 (2026-06-09)
> **架构审查 + 优化:** 2026-06-12 (20 项修复)

---

## 完成清单

### 基础设施
- [x] Docker Compose 开发环境 (PostgreSQL 16 + Redis 7 + MinIO)
- [x] FastAPI 项目结构 (分层架构: route → service → repository → model)
- [x] SQLAlchemy 2.0 async + Alembic 配置
- [x] Pydantic v2 Settings (环境变量管理)
- [x] CORS 配置
- [x] 全局异常处理中间件
- [x] 审计日志模型 + Logger (已挂载到全部路由)

### 认证系统
- [x] 飞书 OAuth 2.0 SSO 登录
- [x] JWT access + refresh token 签发
- [x] Refresh token 轮转 (Redis 黑名单 + jti, 2026-06-12 新增)
- [x] Bearer token 认证中间件
- [x] RBAC 角色权限 (admin/pm/designer/engineer/supplier/cert_specialist/ops)
- [x] 前端登录页 + OAuth 回调处理
- [x] Zustand auth store (token 持久化, 自动恢复)
- [x] API Rate Limiting (/refresh 5次/分钟, 2026-06-12 新增)

### 产品管理
- [x] 产品 CRUD (code 自动生成: AC-2026-0001)
- [x] 产品类型: AC/DC/Portable
- [x] 目标市场 + 认证需求 (JSONB)
- [x] 生命周期状态机 (5 状态, 受控流转)
- [x] 生命周期变更日志
- [x] 前端: 产品列表 + 产品详情 + 生命周期流转弹窗

### 项目管理
- [x] 项目 CRUD
- [x] WBS 任务树 (父子任务, 角色分配, 交付物, 飞书同步)
- [x] 技术 Issue 跟踪 (严重级别, 状态流转)
- [x] 飞书审批集成 (创建审批实例)
- [x] 项目状态机 VALID_TRANSITIONS 校验 (2026-06-12 新增)
- [x] 前端: 项目列表 + 项目详情 + 任务树 + Issue 面板

### 飞书集成
- [x] Tenant Access Token 管理 (Redis 缓存)
- [x] SSO OAuth 客户端
- [x] 消息机器人 (卡片消息 / 文本消息)
- [x] 任务中心集成 (创建/更新/删除任务)
- [x] 日历集成 (创建/删除事件, 里程碑)
- [x] 审批集成 (创建审批实例)
- [x] 审批回调处理 + HMAC-SHA256 签名验证 (2026-06-12 修复)
- [x] 事件订阅 URL 验证

### 前端框架
- [x] React + Vite + TypeScript 工程
- [x] Ant Design 5 + Pro Components
- [x] React Router 路由 + ProtectedRoute 守卫
- [x] MainLayout (侧边栏折叠 + 用户下拉菜单)
- [x] Zustand 状态管理 (auth + app)
- [x] React Query 服务端状态
- [x] Axios 拦截器 (JWT 注入 + 401 处理)
- [x] i18n 国际化 (zh-CN / en-US)
- [x] Dashboard 统计页

### Dashboard
- [x] 4 个统计卡片 (活跃产品/项目/工单/完成任务)
- [x] 最近项目列表 + 最近工单列表

---

## 前期遗留项 (已全部解决)

| 项目 | 状态 | 说明 |
|------|------|------|
| 数据库迁移 | ✅ | `alembic/versions/001_initial.py` 已生成 |
| 测试用例 | ✅ | 模型/集成/Service 测试已补充 |
| 审计中间件挂载 | ✅ | 已挂载到全部路由 (独立事务, 2026-06-12 加固) |
| 飞书审批回调 | ✅ | 签名验证修复 (HMAC-SHA256) + 状态联动 |
| 前端 API Client | ✅ | 已补全所有模块的 API 方法 |

---

## 数据模型

```
✅ users                  ✅ products
✅ lifecycle_change_logs  ✅ projects
✅ project_tasks          ✅ technical_issues
✅ design_files           ✅ firmware_versions
✅ firmware_upgrade_tasks ✅ suppliers
✅ outsource_tasks        ✅ certifications
✅ audit_logs
```

全部 13 个表已投入使用。

---

> **最后更新:** 2026-06-12 — 所有遗留项已解决，通过架构审查
