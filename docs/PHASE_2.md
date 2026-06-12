# Phase 2 — 设计协作与供应链管理

> **目标:** 完成设计文件版本管理和供应商外包管理
> **状态:** 🔴 未开始
> **预计工期:** 见 DEVELOPMENT_PLAN.md

---

## 设计文件管理

### 后端
- [ ] 设计文件上传 (MinIO)
- [ ] 设计文件版本管理 (version 递增, is_current 标记)
- [ ] 设计文件列表/搜索/筛选
- [ ] 设计文件下载 (Presigned URL)
- [ ] 设计文件版本切换

### 前端
- [ ] 设计文件列表页面 (表格 + 筛选)
- [ ] 文件上传 Modal (拖拽上传 + 类型/版本信息)
- [ ] 版本历史面板
- [ ] 文件预览 (图片/PDF, 可后续)
- [ ] ProductDetail 中的设计文件 Tab

### API 端点
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
- [ ] 供应商 CRUD
- [ ] 供应商资质文件管理
- [ ] 供应商评价 (rating, on_time_delivery_rate)
- [ ] 外包任务创建/分配/评审
- [ ] 外包交付物审核 (approve/reject)

### 前端
- [ ] 供应商列表页面 (表格 + 状态筛选)
- [ ] 供应商详情 (资质、评价、外包任务历史)
- [ ] 外包任务管理 (RFQ、报价、交付物审核)
- [ ] 供应商评价表单

### API 端点
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
- [ ] 供应商新增 → 飞书通知 PM
- [ ] 外包交付物提交 → 飞书通知审核人
- [ ] 外包评审结果 → 飞书通知供应商

---

## 依赖
- Phase 1 基础设施
- MinIO 服务 (已在 docker-compose 中)

## 完成标准
- [ ] 可以上传/下载/版本管理设计文件
- [ ] 可以创建供应商并分配外包任务
- [ ] 外包交付物可以走提交流程

---

> **最后更新:** 待 Phase 2 启动
