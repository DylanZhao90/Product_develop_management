# Phase 2 — 设计协作与供应链管理

> **目标:** 完成设计文件版本管理和供应商外包管理
> **状态:** ✅ 已完成 (2026-06-11)
> **架构审查 + 优化:** 2026-06-12 (20 项安全/逻辑/质量修复)

---

## 设计文件管理

### 后端
- [x] 设计文件上传 (MinIO)
- [x] 设计文件版本管理 (version 递增, is_current 标记)
- [x] 设计文件列表/搜索/筛选
- [x] 设计文件下载 (Presigned URL)
- [x] 设计文件版本切换
- [x] 新版本自动标记旧版本 is_current=False

### 前端
- [x] 设计文件列表页面 (表格 + 筛选)
- [x] 文件上传 Modal (拖拽上传 + 类型/版本信息)
- [x] 版本历史面板
- [x] ProductDetail 中的设计文件 Tab

### API 端点 (已实现)
```
GET    /api/v1/design-files?product_id=&file_type=
POST   /api/v1/design-files
GET    /api/v1/design-files/{id}
POST   /api/v1/design-files/{id}/new-version
GET    /api/v1/design-files/{id}/download
GET    /api/v1/design-files/{id}/versions
```

---

## 供应商管理

### 后端
- [x] 供应商 CRUD
- [x] 供应商资质文件管理
- [x] 供应商评价 (rating, on_time_delivery_rate)
- [x] 外包任务创建/分配/评审
- [x] 外包交付物审核 (approve/reject)

### 前端
- [x] 供应商列表页面 (表格 + 状态筛选)
- [x] 供应商详情 (资质、评价、外包任务历史)
- [x] 外包任务管理 (RFQ、报价、交付物审核)

### API 端点 (已实现)
```
GET    /api/v1/suppliers
POST   /api/v1/suppliers
GET    /api/v1/suppliers/{id}
PATCH  /api/v1/suppliers/{id}
GET    /api/v1/suppliers/{id}/outsource-tasks
POST   /api/v1/suppliers/{id}/outsource-tasks
PATCH  /api/v1/outsource-tasks/{id}
POST   /api/v1/outsource-tasks/{id}/review
```

---

## 事件总线集成
- [x] 供应商新增 → 飞书通知 PM
- [x] 外包交付物提交 → 飞书通知审核人
- [x] 外包评审结果 → 飞书通知供应商
- [x] 任务分配 → 飞书卡片消息
- [x] 任务逾期 → 飞书催办
- [x] 认证到期 → 飞书提醒
- [x] 审批结果 → 飞书通知

---

## 完成标准
- [x] 可以上传/下载/版本管理设计文件
- [x] 可以创建供应商并分配外包任务
- [x] 外包交付物可以走提交流程

---

> **最后更新:** 2026-06-12 — 全部完成并通过架构审查
