# Phase 4 — 系统集成与生产就绪

> **目标:** 完成 MES 集成、系统管理、认证管理，达到生产上线标准
> **状态:** 🔴 未开始
> **预计工期:** 见 DEVELOPMENT_PLAN.md

---

## MES/ERP 集成

### 后端
- [ ] SN 数据定时同步 (APScheduler / Celery Beat)
- [ ] SN Registry 批量导入
- [ ] MES SN 查询接口完善
- [ ] 增量同步策略 (只拉取变更)
- [ ] 同步日志和异常告警
- [ ] MES API 认证 (API Key 管理)

### 管理功能
- [ ] 同步任务手动触发
- [ ] 同步状态监控
- [ ] SN 数据对账 (count mismatch 告警)

### API 端点
```
POST   /api/v1/integration/mes/sn-sync     ← 手动触发同步
GET    /api/v1/integration/mes/sn/{sn}     ← SN 详情查询
GET    /api/v1/integration/mes/sync-status ← 同步状态
```

---

## 认证管理

### 后端
- [ ] 认证 CRUD
- [ ] 认证到期提醒 (基于 remind_before_days)
- [ ] 认证文件管理 (上传/下载)
- [ ] 到期自动状态更新 (expiring_soon / expired)
- [ ] 飞书通知 (到期前 90/30/7 天提醒)

### 前端
- [ ] 认证列表 (产品维度)
- [ ] 认证到期倒计时
- [ ] 认证文件上传
- [ ] 到期提醒配置

---

## 系统管理

### 后端
- [ ] 用户管理 CRUD (角色分配、启用/停用)
- [ ] 审计日志查询 (分页 + 筛选)
- [ ] 系统配置管理
- [ ] 数据导出 (CSV/Excel)

### 前端
- [ ] 用户管理页面 (表格 + 角色编辑)
- [ ] 审计日志页面 (时间线 + 筛选)
- [ ] 系统配置页面

### API 端点
```
GET    /api/v1/admin/users             ← 用户列表
POST   /api/v1/admin/users             ← 创建用户
PATCH  /api/v1/admin/users/{id}        ← 更新用户 (角色/状态)
GET    /api/v1/admin/audit-logs        ← 审计日志查询
```

---

## 飞书回调完善

- [ ] 审批回调签名验证
- [ ] 审批结果 → 自动更新项目/产品状态
- [ ] 事件订阅 URL 验证 + 事件处理
- [ ] 卡片交互回调 (按钮点击等)

---

## 性能与安全

- [ ] API Rate Limiting (Redis)
- [ ] 数据库连接池调优
- [ ] 静态文件 CDN 配置
- [ ] API 响应压缩 (GZip)
- [ ] SQL 查询优化 (N+1 检查)
- [ ] 敏感数据脱敏确认 (customer_info 等)
- [ ] 依赖安全审计

---

## 测试

- [ ] 单元测试 (service 层 ≥ 80% 覆盖)
- [ ] API 集成测试 (核心流程)
- [ ] 前端组件测试 (关键交互)
- [ ] E2E 测试 (登录→创建产品→创建项目→审批 全链路)

---

## DevOps

- [ ] 数据库备份策略
- [ ] 日志收集 (结构化日志)
- [ ] 健康检查端点完善
- [ ] 优雅关闭 (graceful shutdown)
- [ ] K8s deployment + service + ingress 配置
- [ ] CI/CD Pipeline (GitHub Actions / GitLab CI)

---

## 完成标准
- [ ] MES SN 数据可以自动同步
- [ ] 认证到期自动提醒
- [ ] 系统管理功能完整可用
- [ ] 测试覆盖率 ≥ 80%
- [ ] K8s 部署可运行
- [ ] CI/CD 流水线就绪

---

> **最后更新:** 待 Phase 4 启动
