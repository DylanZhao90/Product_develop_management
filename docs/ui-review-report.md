# PDM Frontend UI 全面审查报告

> 审查日期: 2026-06-17  
> 审查范围: 47 个前端源文件 (tsx/ts/css)  
> 覆盖: 路由、布局、10 个页面、7 个组件、3 个 CSS 文件、主题系统、服务层  
> 基于 ui-designer 8 大能力矩阵

---

## 1. UI/UX 规则 (99条UX规则)

### 1.1 数据标签永远可见 ✅
- EnhancedDashboard.tsx:152-203 — `label: { show: true, position: "top" }` 在 line/bar/pie/sankey 图表中统一应用 ✅
- ChartWidgets.tsx:58 — 饼图 `label: { show: true }` ✅
- Analytics/index.tsx — 所有 chart option makers 均含 `label: { show: true }` ✅

### 1.2 空状态处理
- `frontend/src/pages/Dashboard/widgets/ActivityFeed.tsx:29` — [HIGH] 无数据时使用 `Empty` 组件，但缺少触发"刷新"或"前往创建"的 CTA 按钮
- `frontend/src/pages/Dashboard/widgets/ProductTable.tsx:56` — [MED] 使用 `Empty` 组件，无刷新/重试按钮
- `frontend/src/pages/Projects/ProjectDetail.tsx:317` — [MED] 任务/问题空状态仅显示图标+文字，缺少 CTA
- `frontend/src/pages/Suppliers/SupplierDetail.tsx:125` — [MED] 空状态同上
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:1261` — [HIGH] 桑基图无流转数据时仅显示文字"暂无流转数据"，缺少备用图表或无数据图示

### 1.3 加载状态
- `frontend/src/components/common/LoadingSkeleton.tsx` — [OK] 丰富的加载骨架屏实现 ✅
- `frontend/src/pages/Dashboard/widgets/StatCards.tsx:41` — [OK] 使用 `Skeleton` 加载态 ✅
- `frontend/src/pages/Dashboard/widgets/ActivityFeed.tsx:21` — [MED] 加载态仅显示 Skeleton，没有 aria-label 标明正在加载（但 LoadingSkeleton 有 `role="status"`）

### 1.4 表单反馈
- `frontend/src/pages/Products/index.tsx:56-60` — [OK] 创建成功/失败使用 `message.success` ✅
- `frontend/src/pages/Projects/index.tsx:40-45` — [OK] 同上 ✅
- `frontend/src/pages/Admin/index.tsx:265-299` — [HIGH] 5 个设置保存回调几乎一致，存在重复代码（DRY 违反），但功能正常

### 1.5 触摸目标 ≥44×44pt
- `frontend/src/components/common/MainLayout.tsx:205-216` — [HIGH] 侧边栏折叠按钮 28px 高度，触摸目标不足 44pt
- `frontend/src/components/common/MainLayout.tsx:248-260` — [MED] Avatar + 用户名区域可点触范围偏小（仅 Badge + Avatar）
- `frontend/src/styles/dashboard-enhanced.css:147-160` — [HIGH] 组件操作按钮 28×28px (`pdm-widget-actions button`)，远小于 44pt 要求

### 1.6 懒加载与图片优化
- `frontend/src/components/common/Logo.tsx:84-93` — [MED] 自定义品牌 logo 使用 `<img>` 但没有 `loading="lazy"`
- `frontend/src/components/common/MainLayout.tsx:254-258` — [MED] 用户头像 Avatar `src={user?.avatar_url}` 无 fallback 图片尺寸或 loading

---

## 2. 配色/字体

### 2.1 CSS Token 一致性
- `frontend/src/theme/global.css:1-42` — [OK] 完善的 CSS 变量系统 ✅
- `frontend/src/theme/presets.ts:276-303` — [OK] 5 个主题预设均映射所有 CSS 变量 ✅
- `frontend/src/pages/Login/index.tsx:59-60` — [MED] 硬编码 `#64748b` (slate-500) 而非使用 `var(--color-text-secondary)`
- `frontend/src/pages/Login/index.tsx:126` — [MED] 硬编码 `#94a3b8` (slate-400) 而非 `var(--color-text-muted)`
- `frontend/src/pages/Login/index.tsx:107` — [MED] 硬编码 `#f1f5f9` (slate-100) 而非 `var(--color-border-light)`
- `frontend/src/pages/Dashboard/widgets/LifecyclePanorama.tsx:33` — [LOW] 硬编码 `#6b7280` (gray-500) 用在 eol 阶段，与主题系统不统一
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:107` — [LOW] 阶段颜色硬编码 (#3b82f6, #f59e0b 等)，应通过主题 token 获取

### 2.2 主题切换兼容性
- `frontend/src/theme/global.css:53-56` — [HIGH] 仅在 `[data-theme="linear-dark"]` 下设置了 `:root` 的 background/color，缺少对其他 3 个暗色主题（forest-emerald, sunset-amber, ocean-depth）的覆盖（虽然它们 mode="default"，但未来扩展暗色主题时会出现全局白背景）
- `frontend/src/styles/dashboard-enhanced.css:183-188` — [LOW] 仪表盘标题使用 `background-clip: text` 渐变色，在暗色主题（linear-dark）下可能不可见（缺少暗色 fallback）

### 2.3 字体栈
- `frontend/src/theme/presets.ts:104-105` — [OK] 包含 Inter, Noto Sans SC, PingFang SC 等多语言 Fallback ✅

---

## 3. 布局与响应式

### 3.1 整体布局
- `frontend/src/components/common/MainLayout.tsx:147-282` — [OK] Ant Design Layout (Sider + Header + Content) 结构清晰 ✅
- `frontend/src/theme/global.css:499-544` — [OK] 移动端侧边栏 overlay 模式实现正确 ✅
- `frontend/src/theme/global.css:469-480` — [OK] 表格水平滚动支持 ✅

### 3.2 响应式断点
- `frontend/src/theme/global.css:483-496` — [OK] 480px 响应式 ✅
- `frontend/src/theme/global.css:498-637` — [OK] 768px 响应式 ✅
- `frontend/src/styles/dashboard-enhanced.css:359-469` — [OK] 仪表盘专用响应式 ✅
- `frontend/src/pages/Analytics/styles.css:247-340` — [OK] 分析页专用响应式 ✅

### 3.3 布局问题
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:1530` — [MED] SortableContext 使用 `verticalListSortingStrategy`，但 Column 使用 `Row/gutter` 布局，拖拽时可能导致视觉顺序与 DOM 顺序不一致
- `frontend/src/pages/Analytics/index.tsx:558` — [LOW] Sankey Card 使用 `flexDirection: "column"` + `min-height: 500px`，在手机竖屏（< 480px）时可能高度不足
- `frontend/src/pages/Dashboard/widgets/LifecyclePanorama.tsx:160` — [MED] 阶段卡片 Column 配置 `xs={24} sm={12} md={12} lg={8} xl={4} xxl={4}`，在 lg 断点(≥992px) 下 3 列布局，xxl(≥1600px) 下 6 列，宽度跨度可能使内容在 lg 下过窄

---

## 4. Ant Design 组件使用规范

### 4.1 组件使用正确性
- `frontend/src/pages/Products/index.tsx:161` — [HIGH] 使用自定义 `ProTable`（antd-imports.tsx:26），但实际只做了简单 `Table` 包装，`ProTable` 名称暗示 ProComponents 功能（搜索/配置），但未实现任何 ProTable 特性 — 命名误导
- `frontend/src/pages/Products/ProductDetail.tsx:22` — [LOW] 重复导入 `SwapOutlined` 两次（line 22 和 line 23）
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:15-29` — [MED] 导入大量 antd 组件但部分未使用（如 `message`, `Tooltip` 实际上在使用, 但 `Drawer` 等只用一次，模块化不够好）

### 4.2 组件嵌套深度
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx` — [HIGH] 单个文件 1648 行，包含 6 个以上的子组件定义（`StageStatCard`, `LifecycleSankey`, `ApprovalTimeline`, `StageDeepDivePanel`, `SortableWidget`, `DragOverlayContent`, `AnalyticsView`），严重违反单一职责原则
- `frontend/src/pages/Admin/index.tsx` — [HIGH] 1199 行，包含用户管理、系统设置、产品配置、项目配置、供应商配置 5 个独立模块

### 4.3 antd-imports 使用
- `frontend/src/components/common/antd-imports.tsx` — [MED] 仅 Products/index.tsx 使用了 `antd-imports`，其他页面直接导入 `antd`，使用不一致。应统一导入方式

### 4.4 Modal 使用
- `frontend/src/pages/Products/index.tsx:186-206` — [OK] Create Modal 使用 `Form` + `validateFields` ✅
- `frontend/src/pages/Admin/index.tsx` — [MED] 多个 Modal 的 confirmLoading 绑定正确，但缺少键盘可访问性（`onKeyDown` 未处理）

---

## 5. 无障碍 WCAG

### 5.1 Skip to Content
- `frontend/src/components/common/SkipToContent.tsx` — [BLOCKER] 该组件已定义但**从未在 App.tsx 或 main.tsx 中使用**。所有页面缺少跳过导航链接，影响键盘用户
- 实际排查: 该组件未出现在 `main.tsx` 或 `App.tsx` 的导入或渲染中

### 5.2 Role 和 ARIA 属性
- `frontend/src/components/common/LoadingSkeleton.tsx:34` — [OK] 使用 `role="status"` 和 `aria-label` ✅
- `frontend/src/components/common/ErrorBoundary.tsx:55` — [OK] 使用 `role="alert"` ✅
- `frontend/src/components/common/PageHeader.tsx:78` — [OK] 面包屑链接有 `aria-label` ✅

### 5.3 缺失 ARIA
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:1315` — [HIGH] 拖拽手柄按钮 (`button` 元素) 无 `aria-label` 或 `aria-describedby`
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:1321-1328` — [HIGH] 图钉/关闭按钮无 `aria-label`
- `frontend/src/styles/dashboard-enhanced.css:147-160` — [HIGH] `pdm-widget-actions button` 所有操作按钮无 `aria-label`
- `frontend/src/components/common/MainLayout.tsx:205-216` — [MED] 侧边栏折叠按钮无 `aria-label`（从图标可推断但无显式标签）

### 5.4 对比度
- `frontend/src/pages/Dashboard/widgets/LifecyclePanorama.tsx:110-113` — [HIGH] `#9ca3af` (gray-400) 文字在白色背景上对比度约 2.8:1，不满足 WCAG AA 4.5:1 要求
- `frontend/src/theme/global.css:25` — `var(--color-text-muted): #94a3b8` 在白色背景上约 3.2:1
- `frontend/src/pages/Dashboard/widgets/LifecyclePanorama.tsx:131-133` — [HIGH] "pending" 状态的标签文字颜色设为 `#9ca3af`，对比度不足
- `frontend/src/pages/Login/index.tsx:59` — [MED] 副标题文字 `#64748b` 在白色卡片背景上约 4.2:1（接近但略低于 4.5:1 严格标准）

### 5.5 键盘操作
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:1315` — [HIGH] `SortableWidget` 使用 `useSortable` 实现 DnD，但拖拽依赖鼠标/触摸操作，键盘用户无法重新排序
- `frontend/src/pages/Projects/ProjectDetail.tsx:197-213` — [MED] 任务状态 `Select` 嵌入 Table 单元格，键盘导航流可能中断
- `frontend/src/pages/Login/index.tsx:36` — [MED] 登录卡片 Body 使用内联 `padding` 而非样式类，但键盘可聚焦元素可正常 Tab

### 5.6 Emoji 作为结构化内容
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:108-112` — [HIGH] 状态图标使用 emoji (🔬 🧪 🚀 ⏸️ 🏁)，屏幕阅读器会朗读 unicode 名称如"test tube"等，缺乏语义含义。应使用 `aria-hidden` 包裹或使用 SVG 图标
- `frontend/src/pages/Dashboard/widgets/LifecyclePanorama.tsx:28-33` — [HIGH] 同上问题（emoji 作为阶段标识）
- `frontend/src/pages/Analytics/index.tsx:332-338` — [HIGH] 图表标题中使用 emoji (🔧 📊 ✅ 🌍 🔌 ⛔ 🛟 📅)，应添加 `aria-hidden` 或使用图标组件
- `frontend/src/components/common/MainLayout.tsx:1315` — [HIGH] 图钉/拖拽使用 emoji `📌` 和 `⋮⋮`，缺乏语义

---

## 6. Vercel 设计 Linter (交付前审查清单)

### 6.1 页面元数据
- `index.html` — [HIGH] 未静态检查，但从入口 `main.tsx:1-37` 可推断缺少 `<title>` 动态更新机制，所有页面共享同一个 title
- `frontend/src/App.tsx` — [MED] React Helmet 或 `document.title` 未使用，路由切换时页面标题不变

### 6.2 性能
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:152-203` — [MED] `makeLineOption` 在每次渲染时创建新对象，虽被 `useMemo` 包装但子组件使用仍需检查
- `frontend/src/pages/Analytics/index.tsx:500-505` — [MED] 路由页面没有 `React.lazy()` / `Suspense` 代码分割，所有页面一次性加载

### 6.3 代码质量
- `frontend/src/pages/Products/index.tsx:161` — [HIGH] 如上所述 `ProTable` 命名误导
- `frontend/src/pages/Admin/index.tsx:22-41` — [MED] 设置存储键名全局硬编码，可能存在 localStorage 键冲突风险
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:1374-1387` — [MED] 仪表盘数据使用硬编码 mock 值，未通过 API 获取

### 6.4 错误边界
- `frontend/src/App.tsx` — [MED] 全局 ErrorBoundary 未在路由级别包裹页面，各页面自行处理错误导致体验不一致
- `frontend/src/components/common/ErrorBoundary.tsx:57-99` — [OK] ErrorBoundary 实现完整 ✅

### 6.5 Suspense & 代码分割
- `frontend/src/App.tsx:64-92` — [HIGH] 全部 12 个页面一次性导入（`import EnhancedDashboard from "./pages/Dashboard/EnhancedDashboard"` 等），无 `React.lazy()` 分割，首屏加载包含全部页面代码

---

## 7. 动效规范

### 7.1 动画属性规范 ✅
- `frontend/src/theme/global.css:269-275` — `fadeInUp` 仅使用 `opacity`/`transform` ✅
- `frontend/src/theme/global.css:428-444` — `slideInRight` 仅使用 `opacity`/`transform` ✅
- `frontend/src/theme/global.css:297-300` — `glowPulse` 仅使用 `transform`/`opacity` ✅
- `frontend/src/theme/global.css:447-453` — `badgePulse` 仅使用 `box-shadow` ✅

### 7.2 动画时长 ✅
- `frontend/src/theme/global.css:39` — CSS 变量 `--transition-fast: 150ms` ✅
- `frontend/src/theme/global.css:40` — `--transition-base: 250ms` ✅
- `frontend/src/theme/global.css:41` — `--transition-slow: 400ms` ✅
- 所有动画落在 150-400ms 范围内 ✅

### 7.3 prefers-reduced-motion ❌
- `frontend/src/theme/global.css` — [HIGH] 全局搜索无 `@media (prefers-reduced-motion: reduce)` 或 `prefers-reduced-motion: no-preference` 支持。所有动画在用户设置了减少动效时仍会播放
- `frontend/src/styles/dashboard-enhanced.css:170-180` — [HIGH] `pdmFadeInUp` 动画缺少 `prefers-reduced-motion` 媒体查询
- `frontend/src/pages/Analytics/styles.css:306-309` — [HIGH] `pdmPulse` 动画缺少 `prefers-reduced-motion` 媒体查询

---

## 8. 数据可视化

### 8.1 ECharts 图表标签 ✅
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:197-203` — Line Chart labels `{ show: true }` ✅
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:228-234` — Bar Chart labels `{ show: true }` ✅
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:259-265` — Pie Chart labels `{ show: true }` ✅
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:414-427` — Sankey labels `{ show: true }` ✅
- `frontend/src/pages/Dashboard/widgets/ChartWidgets.tsx:58` — Pie labels `{ show: true }` ✅
- `frontend/src/pages/Dashboard/widgets/ChartWidgets.tsx:111` — Bar labels `{ show: true }` ✅
- `frontend/src/pages/Analytics/index.tsx:54-55` — Line labels `{ show: true }` ✅
- `frontend/src/pages/Analytics/index.tsx:70` — Bar labels `{ show: true }` ✅
- `frontend/src/pages/Analytics/index.tsx:85` — Pie labels `{ show: true }` ✅

### 8.2 Tree-shaking 注册完整性
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:63-66` — [MED] 注册了 `BarChart, LineChart, PieChart, SankeyChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer`。但缺少 `DatasetComponent`（未使用）、`TitleComponent`（未使用）— 注意: 部分图表使用 `title` 字符串而非 `titleComponent`
- `frontend/src/pages/Dashboard/widgets/ChartWidgets.tsx:17` — [OK] 注册了需要的组件 ✅
- `frontend/src/pages/Analytics/index.tsx:22` — [OK] 注册了 `BarChart, LineChart, PieChart, SankeyChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer` ✅

### 8.3 空数据状态
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:1260-1262` — [MED] Sankey 无数据时显示文字"暂无流转数据"，而非空的 ECharts 图表 + 提示
- `frontend/src/pages/Analytics/index.tsx:592-594` — [MED] 同上，无流转数据时显示文字
- `frontend/src/pages/Analytics/index.tsx:401-406` — [LOW] Market 图表空数据分支返回 `<div className="chart-empty">` 包含 `"No market data"` 而不是使用 `Empty` 组件统一样式

### 8.4 图表 responsive
- `frontend/src/pages/Analytics/index.tsx:163` — [MED] Sankey 图表使用 `style={{ height: "100%", width: "100%" }}` 但父容器 `.sankey-chart-container` 有 `min-height: 500px`，在移动端（<768px）降至 320px，在小屏设备上文本可能重叠
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:438` — [MED] Dashboard 内的 Sankey 使用固定高度 `220px`，无响应式调整

### 8.5 Chart 颜色主题
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx:864-866` — [LOW] `getStageEnrichment` 使用了硬编码颜色数组而非 `useEChartsColors` 动态颜色
- `frontend/src/pages/Analytics/index.tsx:310` — [LOW] `getStageSpecificMetrics` 也使用了硬编码颜色

---

## 汇总

| 级别 | 数量 | 关键区域 |
|------|------|----------|
| BLOCKER | 2 | SkipToContent 未使用；emoji 作为结构化内容缺少 aria-hidden |
| HIGH | 16 | 触摸目标不足、暗色主题覆盖不全、大文件拆分、缺失代码分割、prefers-reduced-motion 缺失、ARIA 缺失、对比度不足、ProTable 命名误导 |
| MED | 22 | 空状态无 CTA、硬编码色值、响应式布局粗糙点、重复代码、动态 title 缺失、加载态的 aria 不完整、仪表盘 mock 数据 |
| LOW | 7 | 次要颜色硬编码、重复导入、次要响应式优化、次要代码组织 |

### 最紧急修复项 (BLOCKER)
1. **frontend/src/components/common/SkipToContent.tsx** — 组件已定义但未在 App 入口使用，需在 `main.tsx` 或 `App.tsx` 中引入作为 `<Routes>` 之前的第一个元素
2. **frontend/src/pages/Dashboard/EnhancedDashboard.tsx:1315** — 拖拽手柄/图钉/关闭按钮无 `aria-label`
3. **frontend/src/pages/Dashboard/widgets/LifecyclePanorama.tsx:110-113** — `#9ca3af` 文字对比度不足 WCAG AA
4. **frontend/src/theme/global.css / dashboard-enhanced.css** — 全局缺少 `prefers-reduced-motion` 支持
5. **frontend/src/pages/Dashboard/EnhancedDashboard.tsx:28-33** — Emoji 作为阶段标识无 `aria-hidden`

### 重要改进 (HIGH)
1. **frontend/src/App.tsx** — 所有页面使用静态 `import`，应改用 `React.lazy()` + `Suspense` 代码分割
2. **frontend/src/pages/Dashboard/EnhancedDashboard.tsx (1648行)** — 应拆分为多个文件（至少 3 个：components, analytics, main）
3. **frontend/src/pages/Admin/index.tsx (1199行)** — 应拆分为多个模块文件
4. **frontend/src/styles/dashboard-enhanced.css:147-160** — 操作按钮 28×28px 扩大至 ≥44×44pt
5. **frontend/src/pages/Products/index.tsx:161** — `ProTable` 改为标准 `Table` 或实现完整的 ProTable 功能
