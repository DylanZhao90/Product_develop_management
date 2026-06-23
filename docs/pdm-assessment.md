# PDM 现状评估报告

> 评估日期: 2026-06-23 | 评估人: Brain PM Agent
> 项目: Product_develop_management (EV Charger PDM)
> 技术栈: React 18 + TypeScript + Vite + Ant Design 5 + ECharts + zustand + react-intl

---

## 一、项目总览

### 1.1 路由结构 (App.tsx)
- 13 个主路由 + 5 个详情路由，嵌套在 ProtectedRoute + MainLayout 下
- 路由结构清晰，无嵌套过深问题
- MainLayout 内嵌 `<Outlet />`，标准布局模式

### 1.2 目录规模
| 目录 | 文件数 | 评估 |
|------|--------|------|
| pages/ | ~15 页面文件 | 正常规模 |
| services/api.ts | 1073 行 | **过大**：内联 mock 数据 + 8 个 API 模块 |
| services/api-types.ts | 299 行 | 良好，类型定义清晰 |
| Dashboard/EnhancedDashboard.tsx | 1649 行 | **严重过大**：应拆分 |
| Dashboard/widgets/ | 5 个 widget 文件 | 合理拆分 |
| locales/ | 2 个 JSON (zh-CN/en-US) | **不足**：仅 2 语种，资源键覆盖面不全 |

---

## 二、七大问题逐项诊断

### 问题 1：按钮不生效

**现状：** 大部分按钮实际都有事件绑定。

| 页面 | 按钮 | 绑定状态 | 备注 |
|------|------|---------|------|
| Products | 新建 | ✅ Modal 弹出 | 表单字段不全（缺 target_markets） |
| Products | 删除 | ✅ Modal.confirm + mutation | 功能完整 |
| Products | 行点击 | ✅ navigate() 跳转详情 | 功能完整 |
| Projects | 新建 | ✅ Modal 弹出 + product_id 必选 | 功能完整 |
| Projects | 删除 | ✅ Modal.confirm + mutation | 功能完整 |
| Projects | 行点击 | ✅ navigate() 跳转详情 | 功能完整 |
| Dashboard | 保存布局 | ✅ handleSave | 功能完整 |
| Dashboard | 重置布局 | ✅ handleReset | 功能完整 |
| Dashboard | 模块管理 | ✅ Drawer 弹出 | 功能完整 |
| Dashboard | 阶段卡片点击 | ✅ navigate(/lifecycle) | 功能完整 |

**结论：** 用户所指的"不生效"可能来自：
1. **Design / Suppliers / Lifecycle / Firmware / Certifications 页面**——这些页面的按钮可能未绑定真实 handler（mock 只返回数据，按钮无操作）
2. **Production 版本** 可能尚未部署完整的 action handler 绑定

**修复方向：** 逐一检查 Design / Suppliers / Lifecycle / Analytics 等页面的按钮 handler。

---

### 问题 2：文字溢出文本框

**现状：** 发现 3 处溢出风险：

1. **EnhancedDashboard Sankey 图** (EnhancedDashboard.tsx:438)
   - Sankey 高度固定 220px，节点 label 默认 `{ show: true }`
   - 中文标签"退市"等文本在节点宽度不足时溢出
   - 根因：Sankey 的 `nodeWidth: 18` 过窄，label 无法内嵌显示

2. **LifecyclePanorama 阶段卡片** (LifecyclePanorama.tsx)
   - 产品名称在 `<Col xs={24} ... xl={4}>` 极窄列中
   - 已通过 TooltipLabel 组件做 `max={14}` 截断 + ellipsis
   - 但 `approval_step` 标签（如"试产审批"）在 `.pdm-timeline-label` 中 `white-space: nowrap` 且无 overflow 处理

3. **Products / Projects 表格**
   - 表格列有 `ellipsis: true`，溢出有 ... 提示，处理得当

**修复方向：** Sankey 节点宽度调整 + label 定位从内嵌改为外部；时间轴标签加 `text-overflow: ellipsis`。

---

### 问题 3：中英文本混杂

**发现位置（硬编码中文）：**

| 文件 | 行号 | 内容 |
|------|------|------|
| EnhancedDashboard.tsx | 107-111 | `STAGE_META.label`："研发中"、"试产移交"等 |
| EnhancedDashboard.tsx | 1630-1641 | Tab 标签："总揽"、"数据分析" |
| EnhancedDashboard.tsx | 473 | "审批节点流程" |
| EnhancedDashboard.tsx | 475 | "暂无产品数据" |
| EnhancedDashboard.tsx | 588 | "暂无数据" |
| EnhancedDashboard.tsx | 663 | "{count} 个产品" |
| EnhancedDashboard.tsx | 680-747 | "产品数"、"平均时长"、"{n}天"等 |
| EnhancedDashboard.tsx | 1181 | "产品生命周期流转全景" |
| EnhancedDashboard.tsx | 1193 | "{n} 条流转" |
| EnhancedDashboard.tsx | 1262 | "暂无流转数据" |
| EnhancedDashboard.tsx | 1589 | 回退文案"产品开发生命周期概览" |
| LifecyclePanorama.tsx | 37-67 | 审批步骤标签："创建"、"技术评审"等 |
| LifecyclePanorama.tsx | 183-190 | 阶段英文缩写 "R&D"/"Pilot"/"Market" |
| Products/index.tsx | 118 | `"AC"/"DC"/"Portable"` |
| Products/index.tsx | 234-254 | Stat title `"AC Charger"/"DC Charger"/"Portable"` |
| Products/index.tsx | 297-299 | Select 选项 `"AC Charger"` 等 |
| Products/index.tsx | 339-341 | Modal 中 Select 选项同上 |
| Projects/index.tsx | 161-198 | Stat title `"Total"/"Pending"/"Approved"/"In Progress"` |
| LifecyclePanorama.tsx | 182-191 | 阶段英文缩写硬编码 |

**发现硬编码英文（但应走 i18n）：**
- Products/index.tsx 类型标签 `"AC"` / `"DC"` / `"Portable"` 是英文，需要走 `t("product.type.xxx")`

**i18n 键缺失：**
| 调用处 | 缺失键 | 影响 |
|--------|--------|------|
| Products/index.tsx:346 | `common.desc` | 回退显示 "Description" |
| EnhancedDashboard 多处 | `dashboard.xxx` | 显示中文原文 |
| EnhancedDashboard 多处 | `lifecycle.panorama.xxx` | Panorma 专用键 |

**语种支持现状：** 仅 zh-CN + en-US，用户要求**7 语种**（zh-CN/en-US/ja-JP/ko-KR/de-DE/fr-FR/es-ES）——缺少 5 个语种。

---

### 问题 4：产品管理页面重构

**现状：**
- 产品页面：列表 + 创建 Modal + 详情页
- 创建产品**不关联项目**——可直接新建独立产品
- 产品表单缺少 `target_markets` 和 `certification_requirements` 字段
- 产品详情页已有生命周期流转 + 设计文件列表功能

**需要改变：**
- 产品必须来自项目 → 移除 Products 页面独立"新建"入口
- 新增产品只能通过**项目创建 Modal** 中的"新建产品"按钮
- 产品页面展示完整属性列表（code/model/name/type/target_markets/cert_requirements/lifecycle_status/timestamps）

---

### 问题 5：项目管理重构

**现状：**
- 项目类型仅 2 种：`new_product` / `version_upgrade`
- 创建项目时**必须选择已有产品**（通过 product_id Select 下拉），但无法新建产品
- 项目状态 5 种：pending_approval → approved → in_progress → completed → closed

**需要改变：**
- 新增 2 种项目类型：`product_certification` / `other`
- 创建项目 Modal 中：选择产品（下拉） + "新建产品"按钮（即模态中嵌 mini 表单）
- 项目类型后台可配置（从硬编码枚举改为数据库配置表）

---

### 问题 6：项目审批流

**现状：**
- `api-types.ts` 中 Project 已有 `approval_id` 字段
- `api.ts` 中已有 `projectApi.submitApproval()`
- 审批状态仅体现在 `status = "pending_approval"` → `"approved"` 转换上
- **无节点级审批流**（多节点、角色分离、意见记录等）

**需要构建：**
- 审批数据模型：ApprovalNode（节点）、ApprovalRecord（审批记录）、ApprovalAction（动作枚举）
- 审批流程引擎：根据项目类型选择审批模板
- 每个节点：审批人角色 + 审批意见 + 动作（批准/拒绝/驳回/待定）
- 项目提交审批后，所有节点通过后才进入项目池

---

### 问题 7：所有页面数据同源

**现状：**
- Dashboard 使用 `dashboardApi.getStats()`（有 mock）
- Products 使用 `productApi.list()`
- Projects 使用 `projectApi.list()`
- EnhancedDashboard Analytics 使用 `buildMockLifecycleAnalyticsData()`（纯内联 mock）
- Dashboard stats 使用**内联硬编码** (EnhancedDashboard.tsx:1380-1385)，未调用 API

**问题：** 各模块数据源互相独立，Dashboard 不作为数据聚合层，数据不一致。
- Dashboard stats 是硬写的固定值，不与 Products/Projects 实际数据关联
- 生命周期分析数据也是纯 mock，不与真实产品/项目数据关联

**需要改变：** 所有统计数据从后端最终计算得出，前端仅做展示。Mock 数据应在同一层模拟。

---

## 三、现有代码质量评估

### 3.1 架构强度

| 维度 | 评分 | 说明 |
|------|------|------|
| 路由设计 | ⭐⭐⭐⭐⭐ | 标准 React Router v6 嵌套路由，ProtectedRoute 优雅 |
| API 层 | ⭐⭐⭐ | try/catch + mock fallback 模式可用，但 mock 数据内联过大 |
| 类型系统 | ⭐⭐⭐⭐⭐ | api-types.ts 定义完整，泛型使用良好 |
| 状态管理 | ⭐⭐⭐⭐ | zustand 轻量高效，store 拆分合理 |
| i18n 架构 | ⭐⭐⭐ | useLocale hook 简洁，但部分 key 缺失 |
| UI 组件化 | ⭐⭐⭐ | 部分组件过大(EnhancedDashboard)，widget 拆分方向正确 |
| CSS 架构 | ⭐⭐⭐⭐ | CSS 变量 + class 命名规范 |
| 测试 | ⭐ | 未发现单元测试/集成测试文件 |

### 3.2 关键风险

1. **EnhancedDashboard.tsx 1649 行**——单一组件过重，难以维护和测试
2. **api.ts 1073 行**——内联 mock 数据过多，阻碍真实后端替换
3. **i18n 仅 2 语种**——扩展至 7 语种工作量大
4. **无审批流数据模型**——需要全新设计数据库和后端接口
5. **Products/Projects 数据关联尚未实施**——需要在后端创建新的表结构和 API 端点

---

## 四、技术债务清单

| 优先级 | 项目 | 位置 | 影响 |
|--------|------|------|------|
| P0 | 硬编码 Dashboard stats | EnhancedDashboard.tsx:1380 | Dashboard 数据永不更新 |
| P0 | EnhancedDashboard 中文硬编码 | 多处 | 切换 en-US 无效 |
| P0 | Sankey 文字溢出 | EnhancedDashboard.tsx:438 | UI 显示异常 |
| P0 | i18n key 缺失(common.desc) | Products/index.tsx:346 | 回退显示英文 |
| P1 | Products 类型标签硬编码 | Products/index.tsx:118,234-254 | 非英非中不统一 |
| P1 | Projects stat 英文硬编码 | Projects/index.tsx:161-198 | 切换中文时仍显示英文 |
| P1 | 项目类型仅 2 种 | api-types.ts:72 | 不满足业务需求 |
| P2 | 无后端 API endpoint | 全站 | 一直使用 mock 数据 |
| P2 | 无审批流数据模型 | 缺失 | 审批业务无法实现 |
| P2 | Products 独立创建入口 | Products/index.tsx:262 | 违反"产品来自项目"规则 |

---

## 五、总结

当前项目是一个**结构良好的 MVP 原型**，路由/类型/状态管理质量较高，但存在三方面关键问题：

1. **UI 完成度**：按钮多数正常，但文字溢出和 i18n 硬编码影响了可用性
2. **数据架构**：Products 与 Projects 的父-子关系未严格执行，Dashboard 数据不真实
3. **功能完整度**：审批流完全缺失，项目类型不足，7 语种仅实现 2 个

修复路径应是：先修 UI bug（溢出/i18n），再重构数据模型（产品-项目-审批流），最后统一数据源。
