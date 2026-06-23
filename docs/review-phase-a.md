# Phase A 代码审查报告

**审查日期**: 2026-06-23
**审查范围**: Design, Suppliers, Lifecycle, Firmware, Certifications, Analytics 页面
**审查人**: Hermes Agent (engineering/reviewer)
**分级**: BLOCKER > HIGH > MED > LOW

---

## 概要

| 文件 | 行数 | BLOCKER | HIGH | MED | LOW |
|------|------|---------|------|-----|-----|
| pages/Design/index.tsx | 249 | 0 | 0 | 1 | 1 |
| pages/Suppliers/index.tsx | 249 | 0 | 0 | 2 | 0 |
| pages/Suppliers/SupplierDetail.tsx | 150 | 0 | 0 | 1 | 0 |
| pages/Lifecycle/index.tsx | 207 | 0 | 0 | 1 | 0 |
| pages/Firmware/index.tsx | 212 | 0 | 0 | 1 | 0 |
| pages/Certifications/index.tsx | 140 | 0 | 0 | 0 | 1 |
| pages/Analytics/index.tsx | 634 | 0 | 1 | 1 | 0 |
| **合计** | **1841** | **0** | **1** | **7** | **2** |

---

## BLOCKER (0)

所有页面的按钮和交互元素均已绑定 onClick/modal/navigate handler，无未绑定的交互元素。

---

## HIGH (1)

### H-01: Analytics/index.tsx — 文件过长，需拆分组件

- **文件**: `frontend/src/pages/Analytics/index.tsx`
- **行数**: 634 行（远超 300 行阈值）
- **问题**: 文件中定义的内联组件/函数过多：
  - `makeLineOption()` (行 37-57)
  - `makeBarOption()` (行 59-74)
  - `makePieOption()` (行 76-90)
  - `StageStatCard` (行 93-114)
  - `LifecycleSankeyCanvas` (行 117-141)
  - `LifecycleSankey` (行 144-191)
  - `StageDeepDivePanel` (行 194-327)
  - `getStageSpecificMetrics()` (行 330-517)
  - 主组件 `Analytics` (行 520-634)

- **建议**: 将以下模块抽取到独立文件：
  - `components/analytics/StageStatCard.tsx`
  - `components/analytics/LifecycleSankey.tsx`
  - `components/analytics/StageDeepDivePanel.tsx`
  - `components/analytics/chartOptions.ts`（`makeLineOption` / `makeBarOption` / `makePieOption`）
  - `components/analytics/stageMetrics.ts`（`getStageSpecificMetrics`）

---

## MED (7)

### M-01: Suppliers/index.tsx — 未使用的变量

- **文件**: `frontend/src/pages/Suppliers/index.tsx`
- **行号**: 124
- **问题**: 变量 `updatedLabel` 被赋值但从未在 JSX 中使用：

  ```tsx
  const updatedLabel = t("common.updated");  // 行 124 — 未使用
  ```

- **建议**: 删除该行，或在需要时直接使用 `t("common.updated")`。

### M-02: Suppliers/index.tsx — 内联样式过度使用

- **文件**: `frontend/src/pages/Suppliers/index.tsx`
- **问题**: 统计摘要卡片区域（行 155-195）大量使用内联 `valueStyle`、`style`、`styles={{ body: { padding: "12px 16px" } }}`。每个 `<Statistic>` 都有独立的 `valueStyle` 对象定义文本颜色/字号/字重。
- **影响**: 代码冗余、主题难以统一维护。
- **建议**: 将 `valueStyle` 中常用的颜色/字号模式抽取为 CSS class 或常量。

### M-03: Lifecycle/index.tsx — 内联样式过度使用

- **文件**: `frontend/src/pages/Lifecycle/index.tsx`
- **问题**: 统计卡片区域（行 108-150）与 Suppliers 同模式，每个 `<Statistic>` 都内联 `valueStyle`、`styles={{ body: { padding: "12px 16px" } }}`。
- **建议**: 与 Design/Suppliers 统一抽取统计卡片组件或 CSS class。

### M-04: Design/index.tsx — 内联样式过度使用

- **文件**: `frontend/src/pages/Design/index.tsx`
- **问题**: 统计卡片区域（行 160-186）同样大量内联样式，模式与 Suppliers/Lifecycle 一致。
- **建议**: 与 Suppliers/Lifecycle 统一抽取。

### M-05: Analytics/index.tsx — 内联样式过度使用

- **文件**: `frontend/src/pages/Analytics/index.tsx`
- **问题**: 整个文件广泛使用内联 `style` 属性，尤其是在 `StageStatCard`（行 102-110）、`StageDeepDivePanel`（行 202-324）和主组件（行 583-620）中。部分内联样式用于动态颜色（来自 `STAGE_META`），但大量静态样式也被内联，例如 `fontSize`, `fontWeight`, 布局间距等。
- **建议**: 动态颜色相关的内联样式可以保留，但静态样式（字体大小、边距等）应迁移到 CSS 文件或 CSS Modules。

### M-06: Suppliers/SupplierDetail.tsx — 未使用的 import

- **文件**: `frontend/src/pages/Suppliers/SupplierDetail.tsx`
- **行号**: 4
- **问题**: `Select` 从 antd 导入但未在文件中使用。文件中的表单使用的是 `<Input>` 而非 `<Select>`。
- **建议**: 移除 `Select`。

### M-07: Firmware/index.tsx — 未使用的 import

- **文件**: `frontend/src/pages/Firmware/index.tsx`
- **行号**: 3
- **问题**: `PlusOutlined` 图标被导入但未在 JSX 中使用。上传按钮使用的是 `UploadOutlined`，OTA 按钮使用的是 `CloudUploadOutlined`。
- **建议**: 移除 `PlusOutlined`。

---

## LOW (2)

### L-01: Design/index.tsx — 统计卡片区域使用 IIFE 包裹

- **文件**: `frontend/src/pages/Design/index.tsx`
- **行号**: 150-187
- **问题**: 统计卡片区域包裹在一个立即执行函数 `{(() => { ... })()}` 中，增加嵌套和阅读负担。虽然组件整体小于 300 行，但抽出为独立子组件（如 `DesignStats`）更清晰。
- **建议**: 抽取为独立的 `DesignStats` 组件，放在同级目录或 `components/` 下。

### L-02: Certifications/index.tsx — DatePicker 使用内联 `width: "100%"`

- **文件**: `frontend/src/pages/Certifications/index.tsx`
- **行号**: 131-132
- **问题**: `<DatePicker style={{ width: "100%" }}>` 中只有一个简单的 CSS 属性，可以用行内样式外的其他方式（如 CSS class、antd 的 `block` 属性）实现。
- **建议**: 使用 `<DatePicker block />`（antd v5+ 支持）或统一 CSS class。

---

## 逐文件详细审查

### 1. Design/index.tsx (249 行)

| 维度 | 结果 | 等级 |
|------|------|------|
| 按钮/交互 handler | ✅ 全部已绑定（Upload/Download/Delete/Search Filter/Modal） | — |
| 未使用的 import | ✅ 无 | — |
| 内联样式过度 | ⚠️ 统计卡片区域大量内联 `<Statistic valueStyle>`, `styles={{body}}` | MED |
| 文件 >300 行 | ❌ 249 行，未超限 | — |

### 2. Suppliers/index.tsx (249 行)

| 维度 | 结果 | 等级 |
|------|------|------|
| 按钮/交互 handler | ✅ 全部已绑定（Create/Delete/Search/Filter/Modal/Row Click→navigate） | — |
| 未使用的 import | ❌ `updatedLabel` 变量未使用（行 124） | MED |
| 内联样式过度 | ⚠️ 统计卡片区域大量内联样式 | MED |
| 文件 >300 行 | ❌ 249 行，未超限 | — |

### 3. Suppliers/SupplierDetail.tsx (150 行)

| 维度 | 结果 | 等级 |
|------|------|------|
| 按钮/交互 handler | ✅ 全部已绑定（Back/AddTask/Approve/Reject/Modal） | — |
| 未使用的 import | ❌ `Select` 未使用（行 4） | MED |
| 内联样式过度 | ✅ 较少，可接受 | — |
| 文件 >300 行 | ❌ 150 行，未超限 | — |

### 4. Lifecycle/index.tsx (207 行)

| 维度 | 结果 | 等级 |
|------|------|------|
| 按钮/交互 handler | ✅ 全部已绑定（Transition button/Status filter/Modal） | — |
| 未使用的 import | ✅ 无 | — |
| 内联样式过度 | ⚠️ 统计卡片区域大量内联样式 | MED |
| 文件 >300 行 | ❌ 207 行，未超限 | — |

### 5. Firmware/index.tsx (212 行)

| 维度 | 结果 | 等级 |
|------|------|------|
| 按钮/交互 handler | ✅ 全部已绑定（Upload/OTA/Download/Filter/Modal/Upload） | — |
| 未使用的 import | ❌ `PlusOutlined` 未使用（行 3） | MED |
| 内联样式过度 | ✅ 较少，可接受 | — |
| 文件 >300 行 | ❌ 212 行，未超限 | — |

### 6. Certifications/index.tsx (140 行)

| 维度 | 结果 | 等级 |
|------|------|------|
| 按钮/交互 handler | ✅ 全部已绑定（Add/Filter/Modal/DatePicker） | — |
| 未使用的 import | ✅ 无 | — |
| 内联样式过度 | ✅ 较少，可接受（仅 DatePicker `width:100%`） | — |
| 文件 >300 行 | ❌ 140 行，未超限 | — |

### 7. Analytics/index.tsx (634 行)

| 维度 | 结果 | 等级 |
|------|------|------|
| 按钮/交互 handler | ✅ 全部已绑定（StageStatCard onClick→toggle） | — |
| 未使用的 import | ✅ 无 | — |
| 内联样式过度 | ⚠️ 全文件广泛使用内联样式（动态/静态混杂） | MED |
| 文件 >300 行 | ❌ **634 行，远超阈值**，6 个内联组件/函数应拆分 | **HIGH** |

---

## 建议优先级排序

1. **HIGH**: 拆分 `Analytics/index.tsx`（634 行 → 多个子组件文件）
2. **MED**: 移除 `Suppliers/index.tsx` 中未使用的 `updatedLabel`
3. **MED**: 移除 `Suppliers/SupplierDetail.tsx` 中未使用的 `Select` import
4. **MED**: 移除 `Firmware/index.tsx` 中未使用的 `PlusOutlined` import
5. **MED**: 统一 Design/Suppliers/Lifecycle 三页面的统计卡片内联样式（可抽为公共组件 `StatCardRow`）
6. **MED**: 将 Analytics 中的静态内联样式迁移到 CSS
7. **LOW**: 移除 Design 统计卡片 IIFE，抽取子组件
8. **LOW**: 将 Certifications 中 DatePicker 的内联 `width:100%` 替换为 `<DatePicker block />`

---

*报告结束。审查遵循 Mnilax 12 规则 + No Slop 原则，所有结论基于实际代码审查。*
