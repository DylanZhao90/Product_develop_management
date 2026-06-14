# PDM 前端演示 · 迭代记录

> Orion-Unified-UI 演示版本 & 产品开发生命周期管理系统前端
> 文档维护人: AI Agent (Orion Labs)

---

## 版本记录

### v2.1.0 — 新增 CEO / 技术总监 角色 (2026-06-14)

#### ✨ 新增
- CEO 角色：kerry / 123456
- 技术总监角色：dylan / 123456

#### 🧪 测试账号
| 账号 | 密码 | 角色 |
|------|------|------|
| admin | 123456 | 系统管理员 |
| sunyue | 123456 | 产品经理 |
| Bryan | 123456 | 研发工程师 |
| kerry | 123456 | CEO |
| dylan | 123456 | 技术总监 |

---

### v2.0.0 — 登录/注册/审核系统 (2026-06-14)

#### ✨ 新增
- **登录系统**：页面启动时弹出登录弹窗，输入用户名密码后进入系统
- **注册功能**：点击"立即注册"打开表单，填写用户信息提交，状态为"待审核"
- **审核系统**：管理员(admin)在"系统管理 → 注册审核"中批准或拒绝新用户
- **退出登录**：头部右侧显示当前用户信息 + 退出按钮
- **账号持久化**：用户数据存储在 localStorage，刷新页面保持登录状态

#### 🧪 测试账号
| 账号 | 密码 | 角色 |
|------|------|------|
| admin | 123456 | 系统管理员 |
| sunyue | 123456 | 产品经理 |
| Bryan | 123456 | 研发工程师 |

#### 🔧 优化
- 登录页显示测试账号列表，点击自动填入凭据
- 密码错误/待审核/格式错误均有提示
- 注册表单含用户名、密码、确认密码、姓名、角色(5种)、邮箱

---

### v1.4.0 — 全页面返回按钮 + 表单增强 (2026-06-14)

#### ✨ 新增
- 每个页面顶部增加 **← 返回工作台** 按钮，一键回到仪表盘
- **个人设置**表单保存功能：填写姓名/邮箱后点击保存，Toast 显示填入内容
- **数据分析**时段切换交互
- **新建产品**弹窗：5个表单字段(型号/名称/编码/类型/市场) + 产品描述 + 取消/创建

#### 🔧 优化
- 所有页面的所有按钮均有 Toast 反馈
- 产品管理支持搜索输入 + 状态下拉 + 类型下拉筛选
- 项目卡片点击查看详情
- 供应商表格每行可查看详情、发起外协

---

### v1.3.0 — 多页面完整 SPA (2026-06-14)

#### ✨ 新增
- **11 个完整页面**，全部可交互：

| 页面 | 内容 |
|------|------|
| 📊 工作台 | 4统计卡片 + 4可拖拽面板 + ECharts图表 + 活动动态 |
| 📦 产品管理 | 8产品表格 + 搜索筛选 + 新建弹窗 + 查看/编辑 |
| 📋 项目管理 | 6张卡片(进度条/任务数/优先级) + 任务/更新按钮 |
| 🎨 设计协同 | 6个文件卡片(STEP/PDF/IGS/STL/DXF) + 下载/历史 |
| 🤝 供应商管理 | 5供应商表格(评级/交付率) + 外协任务 |
| 🔄 生命周期 | 3产品可选 + 8阶段时间线(已完成/进行中/待开始) |
| ⚡ 固件管理 | 5固件版本 + 灰度升级饼图 + 升级统计 |
| 📈 数据分析 | 4个ECharts图表 + 时段切换 |
| 🛡️ 认证管理 | 7条认证记录(CE/FCC/UL/CCC) + 到期状态标签 |
| ⚙️ 系统管理 | 5用户列表 + 配置开关 + 5审计日志 + 3集成状态 |
| 👤 个人设置 | 4编辑字段 + 语言/侧边栏配置 + 通知开关 |

#### 🔗 公网访问
- 本地 HTTP Server: `http://192.168.1.144:8080`
- ~~localtunnel: `https://pdm-annarui.loca.lt`~~ (因刷新中断)

---

### v1.2.0 — 公网隧道 + 全面交互验证 (2026-06-14)

#### ✨ 新增
- 使用 **localtunnel** 建立外网隧道：`https://pdm-annarui.loca.lt`
- 全面审查所有按钮、表单、导航点击可用性
- 3套主题验证：Deep Space / Moonlight / Cyber

---

### v1.1.0 — React 集成组件 (2026-06-14)

#### ✨ 新增
- `frontend/src/pages/Dashboard/EnhancedDashboard.tsx` — React 集成组件
- `frontend/src/styles/dashboard-enhanced.css` — 毛玻璃 + 拖拽样式
- `package.json` — 添加 `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- `App.tsx` — 路由更新，使用 EnhancedDashboard

#### 🎨 设计
- Glassmorphism Pro + Dashboard Utility 融合风格
- 毛玻璃 backdrop-filter: blur(20px)
- 卡片入场 fadeInUp 动画
- ECharts 图表适配主题色
- 响应式 4列 → 2列 → 1列

---

### v1.0.0 — 初始演示 (2026-06-14)

> Orion-Unified-UI 技能首次调用

#### ✨ 新增
- 创建 `dashboard-demo.html` — 可拖拽科技感仪表盘
- 遵循 Orion-Unified-UI 技能 6 步流程

#### 🎨 设计风格
- Glassmorphism Pro + Dashboard Utility
- 3 套 CSS 变量主题 (Deep Space / Moonlight / Cyber)
- 毛玻璃效果 + 发光边框 + 渐变强调色

#### 核心功能
- **拖拽排序**：SortableJS 实现卡片自由排列
- **主题切换**：3套预设一键切换
- **布局持久化**：localStorage 保存/恢复
- **模块管理**：隐藏/显示任意面板
- **固定功能**：📌 卡片固定禁止拖拽
- **ECharts 图表**：生命周期饼图 + 项目进度柱状图
- **统计卡片**：4个指标 + 渐变上边框 + hover 动效
- **活动动态**：8条记录，4种状态色

---

## 技术架构

### 文件结构
```
Product_develop_management/
├── dashboard-demo.html          # 完整 SPA 演示（登录+11页）
├── frontend/src/
│   ├── pages/Dashboard/
│   │   ├── index.tsx            # 原仪表盘
│   │   └── EnhancedDashboard.tsx # 增强版仪表盘(React组件)
│   ├── styles/
│   │   └── dashboard-enhanced.css
│   ├── App.tsx                  # 已更新路由
│   └── package.json             # 已加dnd-kit依赖
└── docs/
    └── UI_DEMO_CHANGELOG.md     # 本文档
```

### 核心技术
| 技术 | 用途 |
|------|------|
| SortableJS | HTML版拖拽排序 |
| @dnd-kit | React版拖拽排序 |
| ECharts 5 | 数据可视化 |
| localStorage | 布局 + 主题 + 用户 持久化 |
| localtunnel | 公网隧道穿透 |

### 设计系统
- 毛玻璃（backdrop-filter: blur）
- 渐变强调色（accent-gradient）
- 三档字体色（primary / secondary / muted）
- shadow-drag 拖拽阴影
- card / card-hover 边框过渡
- animate-in 入场动画

---

> 本日志跟随演示版本持续更新
> 最新版本: v2.0.0
> 访问链接: https://pdm-annarui.loca.lt/dashboard-demo.html
