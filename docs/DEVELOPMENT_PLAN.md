# PDM 开发排期计划

> **当前日期:** 2026-06-14
> **开发人数:** 全栈 1 人 + AI Agent
> **当前状态:** 🟢 **全部完成 — 架构评审 97.15/100 (A+)** ，具备企业级上线条件

---

## 总览

| 阶段 | 内容 | 工期 | 开始 | 完成 | 分数 |
|------|------|------|------|------|------|
| Phase 1 | 核心骨架与基础功能 | 3 天 | 6/09 | 6/09 | — |
| Phase 2 | 设计文件 + 供应商管理 | 3 天 | 6/10 | 6/11 | — |
| Phase 3 | 固件 OTA + 数据分析 | 2 天 | 6/10 | 6/11 | — |
| Phase 4 | 认证 + 管理 + 飞书回调 | 2 天 | 6/11 | 6/12 | — |
| 架构审查 | 安全加固 + 代码优化 | 1 天 | 6/12 | 6/12 | 80.2 |
| v2 优化 | P0/P1/P2 修复 | 0.5 天 | 6/14 | 6/14 | 84.1 |
| v3 深度 | 测试安全CI/CD文档 | 0.5 天 | 6/14 | 6/14 | 94.05 |
| v4 冲刺 | httpOnly/Prometheus/K8s/E2E | 0.3 天 | 6/14 | 6/14 | **97.15** |

---

## Phase 1 (6/09) ✅

> 基础设施 + 认证 + 产品管理 + 项目管理 + 飞书集成 + 前端框架

- [x] Docker Compose 开发环境 (PostgreSQL + Redis + MinIO)
- [x] FastAPI 分层架构 + SQLAlchemy 2.0 async
- [x] 飞书 OAuth 2.0 SSO 登录 + JWT
- [x] RBAC 角色权限 (7 种角色)
- [x] 产品 CRUD + 生命周期状态机
- [x] WBS 任务树 + 技术 Issue
- [x] 飞书集成 (审批/消息/任务/日历)
- [x] React + TypeScript + Ant Design 前端框架

---

## Phase 2 (6/10-6/11) ✅

> 设计文件版本管理 + 供应商外包

- [x] 设计文件上传/版本管理/下载 (MinIO)
- [x] 供应商 CRUD + 资质 + 评价
- [x] 外包任务创建/分配/交付评审
- [x] 前端页面 (设计文件、供应商、外包任务)

---

## Phase 3 (6/10-6/11) ✅

> 固件 OTA + 研发数据分析

- [x] 固件版本 CRUD + 文件上传 (SHA256 校验) + 灰度发布
- [x] OTA 升级任务管理
- [x] Analytics 数据分析 (产品/项目/任务/Issue)
- [x] Dashboard 聚合统计面板

---

## Phase 4 (6/11-6/12) ✅

> 认证管理 + 系统管理 + 飞书回调 + 生命周期页面

- [x] 认证 CRUD + 到期自动提醒
- [x] 用户管理 + 审计日志 (独立事务)
- [x] 飞书审批回调处理 + 事件订阅
- [x] 产品生命周期独立管理页面

---

## 架构审查 (6/12) ✅ — 80.2 分

经过完整四阶段流水线审查优化 (Reviewer → Optimizer × 2):

| 类别 | 修复项 |
|------|--------|
| 🔴 安全 (4项) | 密钥清空校验、HMAC-SHA256、Token 轮转、速率限制 |
| 🟠 逻辑 (8项) | 连接池可配、只读不提交、iss 校验、认证去重、固件限制等 |
| 🟡 质量 (8项) | DRY 重构、BaseRepository、审计独立事务、事件超时等 |

---

## v2 优化 (6/14 上午) ✅ — 80.2→84.1

| 类别 | 修复项 |
|------|--------|
| 🔴 P0 (2项) | logger NameError、.env gitignore 确认 |
| 🟠 P1 (7项) | pyproject.toml、自定义异常体系、Pydantic Field 验证、N+1→BULK UPDATE、advisory lock 防竞态、httpx 连接池复用、Redis 双检锁 |
| 🟡 P2 (5项) | CORS 白名单、OAuth state CSRF、request_id 中间件、前端类型化、7 个复合索引 |

---

## v3 深度优化 (6/14 下午) ✅ — 84.1→94.05

| 类别 | 新增 |
|------|------|
| 🧪 测试 (117 函数) | 9 Service + 全实体 Mock + 状态机参数化 + 异常路径覆盖 |
| 🔒 安全 | CSP/X-Frame-Options/Permissions-Policy 安全头、全局限流 (Redis 滑动窗口) |
| 🏗 架构 | 中间件栈顺序化、健康检查增强 (DB + Redis)、AppException 继承树 |
| 🚀 CI/CD | GitHub Actions: lint → test → build → Trivy 安全扫描 |
| 📚 文档 | 9 份 ADR、ER 关系图、Runbook 运维手册、Nginx 生产配置 |

---

## v4 冲刺 (6/14 晚上) ✅ — 94.05→97.15

| 类别 | 新增 |
|------|------|
| 🔒 httpOnly Cookie | JWT 存储在 httpOnly+secure+sameSite cookie，前端 withCredentials，防 XSS |
| 📊 Prometheus | 请求计数/延迟直方图，/api/metrics 端点 |
| ☸️ K8s | Helm Chart + HPA 自动伸缩 + Liveness/Readiness 探针 |
| 🎭 E2E | Playwright smoke tests: 登录/认证/CORS/安全头 |

---

## 后续建议

| 建议 | 优先级 | 说明 |
|------|--------|------|
| 真实 PostgreSQL 集成测试 | 🟡 中 | Docker Testcontainers |
| OpenTelemetry 分布式追踪 | 🟢 低 | trace_id 跨服务追踪 |
| 前端 i18n 完整翻译 | 🟢 低 | en-US/zh-CN 全覆盖 |

---

> **最后更新:** 2026-06-14 — v4 冲刺完成，97.15/100 A+
