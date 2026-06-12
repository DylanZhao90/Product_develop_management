# Phase 1 — 核心骨架与基础功能

> **目标:** 搭建项目基础设施，完成认证、产品管理、项目管理三条核心链路
> **状态:** ✅ 已完成 (2026-06-09)

---

## 完成清单

### 基础设施
- [x] Docker Compose 开发环境 (PostgreSQL 16 + Redis 7 + MinIO)
- [x] FastAPI 项目结构 (分层架构: route → service → repository → model)
- [x] SQLAlchemy 2.0 async + Alembic 配置
- [x] Pydantic v2 Settings (环境变量管理)
- [x] CORS 配置
- [x] 全局异常处理中间件
- [x] 审计日志模型 + Logger (未挂载到路由)

### 认证系统
- [x] 飞书 OAuth 2.0 SSO 登录
- [x] JWT access + refresh token 签发
- [x] Bearer token 认证中间件
- [x] RBAC 角色权限 (admin/pm/designer/engineer/supplier/cert_specialist/ops)
- [x] 前端登录页 + OAuth 回调处理
- [x] Zustand auth store (token持久化, 自动恢复)

### 产品管理
- [x] 产品 CRUD (code自动生成: AC-2026-0001)
- [x] 产品类型: AC/DC/Portable
- [x] 目标市场 + 认证需求 (JSONB)
- [x] 生命周期状态机 (5 状态, 受控流转)
- [x] 生命周期变更日志
- [x] 前端: 产品列表 (搜索/筛选/分页) + 产品详情 + 编辑 + 生命周期流转弹窗

### 项目管理
- [x] 项目 CRUD
- [x] WBS 任务树 (父子任务, 角色分配, 交付物, 飞书同步)
- [x] 技术 Issue 跟踪 (严重级别, 状态流转)
- [x] 飞书审批集成 (创建审批实例)
- [x] 前端: 项目列表 + 项目详情 + 任务树 + Issue 面板 + 内联状态编辑

### 飞书集成
- [x] Tenant Access Token 管理 (Redis 缓存)
- [x] SSO OAuth 客户端
- [x] 消息机器人 (卡片消息 / 文本消息)
- [x] 任务中心集成 (创建/更新/删除任务)
- [x] 日历集成 (创建/删除事件, 里程碑)
- [x] 审批集成 (创建审批实例)
- [ ] 审批回调处理 (`handle_approval_callback` 为 pass, 待飞书凭证配置后实现)
- [ ] 事件订阅 URL 验证

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

## 待补项目

| 项目 | 优先级 | 说明 |
|------|--------|------|
| 数据库迁移 | 🔴 高 | `alembic/versions/` 为空，需要生成初始 migration |
| 测试用例 | 🔴 高 | 0 个测试，仅有 conftest.py fixture |
| 审计中间件挂载 | 🟡 中 | AuditLogger 代码完整，未在路由中调用 |
| 飞书审批回调 | 🟡 中 | 需要飞书应用凭证配置后实现 |
| 前端 API Client 补全 | 🟢 低 | projectApi 缺少 issues API 方法 (当前直接用 `api` 实例) |

---

## 数据模型 (Phase 1)

```
✅ users                  ✅ products
✅ lifecycle_change_logs  ✅ projects
✅ project_tasks          ✅ technical_issues
✅ design_files (模型就绪，API 未实现)
✅ firmware_versions / firmware_upgrade_tasks (模型就绪)
✅ suppliers / outsource_tasks (模型就绪)
✅ tickets / sn_registry (模型就绪)
✅ certifications (模型就绪)
✅ audit_logs (模型就绪)
```

所有 8 个核心模型已定义，其中 Phase 1 实际使用的: users, products, lifecycle_change_logs, projects, project_tasks, technical_issues

---

## 备注

- 产品生命周期状态机不允许跳过状态，只能按预定义路径流转
- 飞书登录为唯一认证方式（无用户名密码登录），新用户自动注册为 engineer 角色
- 项目 WBS 任务树的 `parent_task_id` 支持无限层级，前端通过递归构建树展示
- 所有 API 响应统一格式: `{success: bool, data: T, message?: string}`
