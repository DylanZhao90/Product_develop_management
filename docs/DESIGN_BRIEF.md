# DESIGN BRIEF — PDM 产品开发与生命周期管理系统

> **风格定位:** 现代科技 SaaS · 大气 · 人性化 · 精美
> **设计基准:** 2026-06-13

---

## 项目概述

- **名称:** PDM (Product Development & Lifecycle Management)
- **类型:** 企业级后台管理系统 (Enterprise Dashboard)
- **目标用户:** 硬件产品经理、研发工程师、供应链管理人员
- **技术栈:** React 18 + TypeScript + Ant Design 5 + Vite

## 设计原则

1. **大气体量** — 充足的留白、清晰的视觉层级、24px 网格基线，让数据密集页面也能"呼吸"
2. **人性化交互** — 圆角与柔和阴影传递温度；状态色不使用纯色而采用映射色阶；Loading 和空状态有温度
3. **科技感** — 深色侧边栏 + 亮色工作区形成聚焦；微妙的渐变点缀（统计卡片、登录页）；毛玻璃头部导航
4. **精美细节** — 1px 以内的微妙边框、平滑的 cubic-bezier 过渡、统一 8px 圆角体系、hover 态 3px 上浮阴影
5. **可访问性** — WCAG 2.1 AA 级色彩对比度 (≥4.5:1)，键盘可操作，ARIA 标注

## 色彩策略

### 主色调 — 科技蓝紫
| Token | Hex | 用途 |
|-------|-----|------|
| Primary 50 | `#f0f5ff` | 浅蓝背景 |
| Primary 100 | `#d6e4ff` | 选中态背景 |
| Primary 500 | `#4f6ef6` | 主按钮、链接、强调 |
| Primary 700 | `#3b4fcf` | Hover 态 |
| Primary 900 | `#1e2f8a` | 深色强调 |

### 辅助色 — 温感点缀
| Token | Hex | 用途 |
|-------|-----|------|
| Success | `#22c55e` | 已完成、通过 |
| Warning | `#f59e0b` | 待处理、审批中 |
| Error | `#ef4444` | 阻塞、异常 |
| Info | `#6366f1` | 信息提示 |

### 中性色 — 灰度体系
| Token | Hex | 用途 |
|-------|-----|------|
| Neutral 0 | `#ffffff` | 卡片/内容背景 |
| Neutral 50 | `#f8fafc` | 页面底色 |
| Neutral 100 | `#f1f5f9` | 浅灰分割 |
| Neutral 200 | `#e2e8f0` | 边框 |
| Neutral 500 | `#64748b` | 次要文字 |
| Neutral 700 | `#334155` | 正文 |
| Neutral 900 | `#0f172a` | 标题/深色侧边栏 |

## 排版策略

| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| H1 | 28px | 700 | 页面主标题 |
| H2 | 22px | 600 | 区块标题 |
| H3 | 18px | 600 | 卡片标题 |
| H4 | 16px | 500 | 表格标题 |
| Body | 14px | 400 | 正文/表格内容 |
| Caption | 12px | 400 | 辅助说明/时间戳 |

- **字体家族:** `-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", "Noto Sans SC", sans-serif`
- **代码/数字:** `"JetBrains Mono", "SF Mono", "Cascadia Code", monospace`（用于统计数据、ID、状态码）

## 间距策略

| 等级 | 值 | 用途 |
|------|-----|------|
| xs | 4px | 图标与文字间距 |
| sm | 8px | 组件内间距 |
| md | 16px | 卡片内 padding |
| lg | 24px | 区块间距、Content margin |
| xl | 32px | 页面级间距 |
| 2xl | 48px | 大区块分割 |

基准单位: **4px**（所有间距为 4 的倍数）

## 形状策略

| 元素 | 圆角 |
|------|------|
| 按钮 | 8px |
| 卡片 | 12px |
| 输入框 | 8px |
| 标签/Tag | 6px |
| 模态框 | 16px |
| 头像 | 50% (圆形) |

## 动效策略

- **过渡函数:** `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design 标准缓动)
- **持续时间:** 快速 150ms (hover) / 标准 250ms (展开) / 慢速 400ms (页面切换)
- **卡片 hover:** `transform: translateY(-3px)` + `box-shadow` 加深
- **侧边栏折叠:** 250ms 平滑宽度过渡
