# Phase 3 — 售后工单与固件 OTA

> **目标:** 完成售后工单系统、固件版本管理和 OTA 升级
> **状态:** 🔴 未开始
> **预计工期:** 见 DEVELOPMENT_PLAN.md

---

## 售后工单系统

### 后端
- [ ] 工单 CRUD (ticket_no 自动生成)
- [ ] 工单状态流转 (pending_assign → processing → resolved → closed)
- [ ] SN 关联查询 (从 MES 同步的 SN 数据)
- [ ] 故障类型分类管理
- [ ] 工单分配 (指定处理人)
- [ ] 处理记录/解决方案
- [ ] SN Registry 数据同步接口

### 前端
- [ ] 工单列表页面 (搜索/筛选/分页)
- [ ] 工单详情 (SN 信息 + 故障描述 + 处理记录)
- [ ] 创建工单 Modal
- [ ] 工单状态流转操作
- [ ] SN 查询组件

### API 端点
```
GET    /api/v1/tickets?status=&fault_type=&search=
POST   /api/v1/tickets
GET    /api/v1/tickets/{id}
PATCH  /api/v1/tickets/{id}
POST   /api/v1/tickets/{id}/assign
POST   /api/v1/tickets/{id}/resolve
POST   /api/v1/tickets/{id}/close
GET    /api/v1/sn/{sn}             ← 从 SN Registry 查询
```

---

## 固件 OTA 管理

### 后端
- [ ] 固件版本 CRUD
- [ ] 固件文件上传 (MinIO + SHA256 校验)
- [ ] 固件版本列表 (按产品型号筛选)
- [ ] OTA 升级任务创建
- [ ] 灰度发布 (gray_scale_percent)
- [ ] 升级进度跟踪 (success/failure count)
- [ ] 失败原因统计 (JSONB 聚合)
- [ ] 飞书通知 (升级完成/失败)

### 前端
- [ ] 固件版本列表页面
- [ ] 固件上传 Modal (文件 + 版本号 + 发布说明)
- [ ] OTA 升级任务页面
- [ ] 升级进度看板 (成功/失败/进行中)
- [ ] 灰度比例配置

### API 端点
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

## 质量分析

### 后端
- [ ] 故障率统计 (按产品/型号/时间段)
- [ ] 故障类型分布
- [ ] 工单处理时长统计 (平均/最大/最小)
- [ ] Top N 故障原因
- [ ] 趋势图数据接口

### 前端
- [ ] 质量分析 Dashboard (ECharts)
- [ ] 故障率趋势折线图
- [ ] 故障类型饼图
- [ ] 工单处理时长柱状图
- [ ] 日期范围筛选器

### API 端点
```
GET    /api/v1/analytics/fault-rate?product_id=&start=&end=
GET    /api/v1/analytics/fault-distribution?start=&end=
GET    /api/v1/analytics/ticket-resolution-time?start=&end=
GET    /api/v1/analytics/top-failures?limit=10&start=&end=
```

---

## 产品生命周期页面 (前端)
- [ ] 独立生命周期管理页面 (替换当前占位页)
- [ ] 可视化状态流转图
- [ ] 批量产品生命周期总览

---

## 事件总线集成
- [ ] 工单创建 → 飞书通知处理人
- [ ] 工单状态变更 → 飞书通知
- [ ] 固件升级完成/失败 → 飞书通知
- [ ] 故障率超阈值 → 飞书告警

---

## 依赖
- Phase 1, Phase 2
- MES 集成 (SN 数据同步)
- 足够量的工单数据用于分析

## 完成标准
- [ ] 工单可以从创建走到关闭
- [ ] SN 可以通过 MES 同步查询
- [ ] 固件可以上传并创建 OTA 任务
- [ ] 质量分析页面有可用的图表

---

> **最后更新:** 待 Phase 3 启动
