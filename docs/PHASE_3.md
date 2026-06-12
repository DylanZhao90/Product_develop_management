# Phase 3 — 固件 OTA 与数据分析

> **目标:** 完成固件版本管理、OTA 升级、研发数据分析
> **状态:** ✅ 已完成 (2026-06-11)
> **架构审查 + 优化:** 2026-06-12 (20 项安全/逻辑/质量修复)

> ⚠️ **设计变更:** 售后工单 (Tickets) 和 SN Registry 已从 PLM 系统范围中移除。
> PLM 聚焦产品从立项到退市的研发管理，工单/SN 由外部 CRM/MES 系统负责。

---

## 固件 OTA 管理

### 后端
- [x] 固件版本 CRUD
- [x] 固件文件上传 (MinIO + SHA256 校验)
- [x] 固件上传 50MB 大小限制 + 异常回滚
- [x] 固件版本列表 (按产品型号筛选)
- [x] OTA 升级任务创建
- [x] 灰度发布 (gray_scale_percent)
- [x] 升级进度跟踪 (success/failure count)
- [x] 失败原因统计 (JSONB 聚合)
- [x] 飞书通知 (升级完成/失败)

### 前端
- [x] 固件版本列表页面
- [x] 固件上传 Modal (文件 + 版本号 + 发布说明)
- [x] OTA 升级任务页面
- [x] 升级进度看板 (成功/失败/进行中)
- [x] 灰度比例配置

### API 端点 (已实现)
```
GET    /api/v1/firmware/versions?product_model=
POST   /api/v1/firmware/versions
GET    /api/v1/firmware/versions/{id}
POST   /api/v1/firmware/upgrade-tasks
GET    /api/v1/firmware/upgrade-tasks
GET    /api/v1/firmware/upgrade-tasks/{id}
PATCH  /api/v1/firmware/upgrade-tasks/{id}
POST   /api/v1/firmware/upgrade-tasks/{id}/cancel
```

---

## ~~售后工单系统~~ (已从 PLM 范围移除)

> 工单/Ticket 功能属于 CRM 系统职责，不在 PLM 范围内。
> SN 序列号追踪属于 MES 生产系统职责。

---

## 研发数据分析

### 后端
- [x] 产品生命周期分布统计
- [x] 项目状态分布统计
- [x] 任务完成率统计
- [x] Issue 严重级别分布
- [x] 产品创建趋势 (按日聚合)
- [x] 认证到期统计

### 前端
- [x] Analytics 分析页面 (统计卡片 + 图表)
- [x] 产品/项目/任务/Issue 数据可视化
- [x] Dashboard 聚合统计面板

### API 端点 (已实现)
```
GET    /api/v1/analytics/overview
GET    /api/v1/analytics/trends
GET    /api/v1/analytics/task-stats
GET    /api/v1/analytics/issue-distribution
GET    /api/v1/dashboard/stats
```

---

## 产品生命周期页面
- [x] 生命周期管理独立页面
- [x] 可视化状态流转 (5 状态)
- [x] 流转校验 (VALID_TRANSITIONS)
- [x] 生命周期变更日志

---

## 完成标准
- [x] 固件可以上传并创建 OTA 任务
- [x] 分析 Dashboard 有可用的统计数据
- [x] 产品生命周期可进行受控状态流转

---

> **最后更新:** 2026-06-12 — 全部完成并通过架构审查
