# Product_develop_management — 实施计划

> 项目: EV充电桩PDM系统 | 代码审查日期: 2026-06-16
> 产出: PM子智能体 实施计划表 + 甘特图排期

---

## 一、任务分解 & 优先级排期

### 🔴 Phase 1 — Blockers (P0) | Week 1

| ID | 领域 | 任务 | 规模 | 预估(h) | 负责人 | 依赖 |
|----|------|------|------|---------|--------|------|
| B1 | 后端 | 修复路由层异常处理：`except ValueError` → `except AppException`，确保业务错误返回正确状态码而**非500**（products.py:73,97 及所有类似模式） | S | 2h | programmer | — |
| B2 | 后端 | 修复 `products.py:81` 返回未序列化ORM对象：用 `LifecycleChangeLogResponse.model_validate(logs)` 包装生命周期日志返回 | S | 1h | programmer | — |
| F-B1 | 前端 | **JWT 存储迁移**：从 localStorage 迁移到 httpOnly Cookie + 刷新令牌机制重构。authStore.ts 移除所有 localStorage token 读写，改为 cookie-based 认证 | M | 8h | ui-designer | — |
| F-B2 | 前端 | **Analytics 页面 i18n 化**：将 pages/Analytics/index.tsx 中所有硬编码中文字符串替换为 `t()` 调用，补充 zh-CN/en-US 翻译 | M | 6h | ui-designer | — |
| F-B3 | 前端 | **修复认证回调签名**：AuthCallback.tsx 发送 `code` 时同时发送 OAuth `state` 参数，与 api.ts 中 `authApi.callback(code, state)` 签名匹配 | S | 2h | ui-designer | F-B1 |

### 🟠 Phase 2 — Backend High Priority (P1) | Week 2

| ID | 领域 | 任务 | 规模 | 预估(h) | 负责人 | 依赖 |
|----|------|------|------|---------|--------|------|
| H1 | 后端 | **修复 Token 吊销 TTL 管理**：`security.py:revoke_token()` 每次 sadd 后对整个 SET 调 expire 重置 TTL。改为每 JTI 独立 key + TTL，或使用有序集合按 expire 时间清理 | S | 3h | programmer | B1 |
| H2 | 后端 | **补全令牌吊销检查**：`security.py:verify_token()` 增加 `is_token_revoked(jti)` 异步调用，拒绝已吊销令牌 | S | 2h | programmer | H1 |
| H3 | 后端 | **修复硬编码通知接收方**：`event_handlers.py:43` 飞书通知 "admin" 占位符 → 改为查询 PM 飞书 ID，注入事件 payload | S | 3h | programmer | — |
| H5 | 后端 | **is_active 检查下沉**：将 `deps.py:50` 的 `user.is_active` 校验下沉到 `UserRepository.get_by_id()`，保持依赖层精简 | S | 1h | programmer | — |

### 🟡 Phase 3 — DELETE 端点 + 服务层 (P1-P2) | Week 3

| ID | 领域 | 任务 | 规模 | 预估(h) | 负责人 | 依赖 |
|----|------|------|------|---------|--------|------|
| H4-1 | 后端 | **产品 DELETE 端点**：`api/v1/products.py` +  ProductService.soft_delete() + 更新 `__init__.py` 注册路由 | S | 2h | programmer | B1 |
| H4-2 | 后端 | **项目 DELETE 端点**：`api/v1/projects.py` + ProjectService.delete() 及级联清理 | S | 2h | programmer | B1 |
| H4-3 | 后端 | **用户 DELETE 端点**：`api/v1/admin.py` + UserRepository.delete()（仅 admin 权限） | S | 1.5h | programmer | B1 |
| H4-4 | 后端 | **供应商 / 设计 / 认证 / 固件 DELETE 端点**：批量补齐剩余4个资源的软删除路由 | M | 4h | programmer | B1 |
| H4-5 | 后端 | **前端调用 DELETE 的 API 包装**：前端 api.ts 新增 `delete*` 方法（productApi.delete, projectApi.delete 等），无需确认弹窗留给各页面 | S | 1h | ui-designer | H4-1~4 |

### 🟢 Phase 4 — 前端重构 (P2) | Week 4

| ID | 领域 | 任务 | 规模 | 预估(h) | 负责人 | 依赖 |
|----|------|------|------|---------|--------|------|
| F-H3 | 前端 | **类型导入去重**：authStore.ts 移除重复 `User` 接口声明，改为从 `api-types.ts` import | S | 1h | ui-designer | — |
| F-H7 | 前端 | **语言设置读取源修正**：locales/index.ts `useLocale()` 改为从 Zustand `appStore` 的 `language` 字段读取，而非 localStorage | S | 1h | ui-designer | — |
| F-H4 | 前端 | **API 层 mock 数据剥离**：api.ts 移除 178 行内联 mock 数据（`getLifecycleAnalytics` 中的模拟），改为从后端真实端点获取；若后端未就绪则抛出清晰错误 | M | 4h | ui-designer | F-B2 |
| F-H2 | 前端 | **EnhancedDashboard mock 数据剥离**：移除 711 行大组件中的内联 mock 数据，改用真实 API 查询 + loading/skeleton/error 状态 | L | 8h | ui-designer | F-H4, F-B2 |
| F-H5 | 前端 | **EnhancedDashboard 组件拆分**：按功能拆分为 StatCards / WidgetGrid / ModuleDrawer / ChartWidgets 子组件 | M | 6h | ui-designer | F-H2 |
| F-H1 | 前端 | **内联样式 → Token 系统**：MainLayout/EnhancedDashboard 中所有内联样式和硬编码颜色迁移到 `tokens.ts` CSS 变量或 Ant Design token | M | 5h | ui-designer | F-H5 |
| F-H6 | 前端 | **CSS 主题选择器修复**：global.css `[data-theme="..."]` 选择器目标修正（匹配 ThemeProvider 实际 set 的 data-theme 属性值） | S | 2h | ui-designer | — |

---

## 二、依赖关系图

```
Week 1 (P0)                          Week 2 (P1)                    Week 3 (P1-P2)               Week 4 (P2)
┌──────────┐                        ┌──────────┐                  ┌────────────┐               ┌──────────────┐
│ B1,B2    │ ── (无依赖) ──         │ H1       │ ◄── 依赖 B1 ──  │ H4-1~4    │               │ F-H3, F-H7  │
│ (并行)   │                        │ (令牌TTL) │                  │ (DELETE端点)│              │ (小修复并行) │
└────┬─────┘                        └────┬─────┘                  └──────┬─────┘               └──────┬───────┘
     │                                    │                             │                             │
     │  ┌──────────┐                      │  ┌──────────┐              │  ┌──────────┐               │  ┌──────────┐
     ├──│ F-B1     │ ─────────────────     │  │ H2       │ ◄── H1 ──  │  │ H4-5     │ ◄── H4-1~4   │  │ F-H4     │
     │  │ (Cookie) │    │                 │  │ (吊销检查)│              │  │ (前端API) │               │  │ (Mock剥离)│
     │  └────┬─────┘    │                 │  └──────────┘              │  └──────────┘               │  └────┬─────┘
     │       │          ▼                 │                                                            │      ▼
     │  ┌────┴─────┐                      │                                                           │  ┌────┴─────────┐
     │  │ F-B3     │ ◄── F-B1 ──         │  ┌──────────┐                                            ├──│ F-H2         │
     │  │ (State)  │                      │  │ H3       │ (无依赖)                                   │  │ (Dashboard)  │
     │  └──────────┘                      │  │ (通知修复)│                                            │  └────┬─────────┘
     │                                   │  └──────────┘                                            │       ▼
     │  ┌──────────┐                     │                                                           │  ┌────┴─────────┐
     └──│ F-B2     │                      │  ┌──────────┐                                            └──│ F-H5         │
        │ (i18n)   │                      │  │ H5       │ (无依赖)                                     │ (组件拆分)   │
        └──────────┘                      │  │ (repo下沉)│                                            └────┬─────────┘
                                          │  └──────────┘                                                ▼
                                                                                                    ┌────┴─────────┐
                                                                                                    │ F-H1         │
                                                                                                    │ (样式迁移)    │
                                                                                                    └──────────────┘

                                                                                                    ┌──────────────┐
                                                                                                    │ F-H6         │
                                                                                                    │ (CSS选择器)   │
                                                                                                    │ (无依赖)      │
                                                                                                    └──────────────┘
```

---

## 三、甘特图排期

```
Phase      Week 1          Week 2          Week 3          Week 4          Week 5
          Mon Tue Wed Thu Fri Mon Tue Wed Thu Fri Mon Tue Wed Thu Fri Mon Tue Wed Thu Fri Mon Tue Wed Thu Fri
         ┌─────────────────┐
P0-B1    │██               │  [0.5d]
P0-B2    │██               │  [0.5d]
P0-F-B1  │████████         │  [2d]
P0-F-B2  │████████         │  [2d]
P0-F-B3  │  ████           │  [1d] ◄── F-B1 done
         └─────────────────┘
         ┌─────────────────┐
P1-H1    │██               │  [0.5d]
P1-H2    │  ██             │  [0.5d] ◄── H1 done
P1-H3    │██               │  [0.5d]
P1-H5    │██               │  [0.25d]
         └─────────────────┘
         ┌─────────────────┐
P2-H4-1  │███             │  [0.5d]
P2-H4-2  │███             │  [0.5d]
P2-H4-3  │██               │  [0.5d]
P2-H4-4  │  ████████       │  [1d]
P2-H4-5  │        ████     │  [0.5d] ◄── H4-1~4 done
         └─────────────────┘
         ┌─────────────────┐
P2-F-H3  │██               │  [0.25d]
P2-F-H7  │██               │  [0.25d]
P2-F-H4  │████████         │  [1d]
P2-F-H2  │  ██████████████ │  [2d] ◄── F-H4 done
P2-F-H5  │      ██████████ │  [1.5d] ◄── F-H2 done
P2-F-H1  │          ██████ │  [1d] ◄── F-H5 done
P2-F-H6  │██               │  [0.5d]
         └─────────────────┘

里程碑
         ▲                 ▲                 ▲                 ▲
     Blocker Done     Auth Secure      CRUD Complete     UI Cleanup
     (P0 all green)  (H1-H5 done)    (全部DELETE端点)   (组件+样式完成)
```

---

## 四、详细任务卡

### B1 — 异常处理修复 (programmer, S, 2h)

```
文件: backend/app/api/v1/products.py
修改: line 73: except ValueError → except AppException
      line 97: except ValueError → except AppException
注意: 需要扫描全局所有 API 路由文件确认没有其他 except ValueError 用于业务异常
```

### B2 — ORM 序列化 (programmer, S, 1h)

```
文件: backend/app/api/v1/products.py
修改: line 80-81:
  logs = await service.get_lifecycle_logs(product_id)
  → logs = await service.get_lifecycle_logs(product_id)
  → return {"success": True, "data": [LifecycleChangeLogResponse.model_validate(l) for l in logs]}
```

### F-B1 — Cookie 迁移 (ui-designer, M, 8h)

```
文件: frontend/src/stores/authStore.ts
变更:
  1. authStore 移除所有 localStorage.getItem/removeItem/setItem("access_token") 等
  2. 初始化 token 从 axios 拦截器从 cookie 读取（通过 withCredentials）
  3. login() 重定向到 OAuth 登录页（后端 Set-Cookie）
  4. logout() 调用 POST /auth/logout + 清除前端状态
  5. checkAuth() 尝试 GET /auth/me，若 401 则跳转登录页
```

### F-B2 — Analytics i18n (ui-designer, M, 6h)

```
文件: frontend/src/pages/Analytics/index.tsx
变更:
  1. 查找所有中文硬编码字符串（"个月", "年", 标签名等）
  2. 替换为 t('analytics.xxx') 调用
  3. 在 zh-CN.json / en-US.json 添加翻译键值对
```

### F-B3 — State 参数 (ui-designer, S, 2h)

```
文件: frontend/src/pages/Login/AuthCallback.tsx
变更:
  line 12: const code = searchParams.get("code");
  → const code = searchParams.get("code");
  → const state = searchParams.get("state") || "";
  line 18: handleCallback(code) → handleCallback(code, state)
  authStore.ts: handleCallback 签名: (code: string, state: string)
```

### H1 — TTL 修复 (programmer, S, 3h)

```
文件: backend/app/core/security.py
当前问题: revoke_token() 每次 sadd 后对整个集合调 expire，新 JTI 重置整个 SET TTL
修复方案:
  Redis SET + 定时清理 → 或 每 JTI 独立 key: revoked_token:{jti} + EXPIRE
  推荐: 使用 Redis SET 存 JTI，另起一个 Sorted Set 存 jti→expire 用于 GC
  或: 独立 key 方案更简单，每 JTI 过期自动删除
```

### H2 — 吊销检查 (programmer, S, 2h)

```
文件: backend/app/core/security.py
新增: verify_token() 内调用 is_token_revoked()
注意: is_token_revoked() 是 async 函数，verify_token() 当前是 sync
      → 需要改造 verify_token 为 async，或在 deps.py 调用处检查
```

### H3 — 通知修复 (programmer, S, 3h)

```
文件: backend/app/core/event_handlers.py
变更: line 42-43: "admin" 硬编码 → 查询 Product 关联 PM 的 feishu_id
      通过 product_repo.get(product_id) → product.pm_id → user_repo.get_by_id → feishu_id
```

### H4-1~4 — DELETE 端点 (programmer, M-xS, 8h)

```
后端路由新增 DELETE 端点（软删除推荐）:
  product:  /api/v1/products/{id} → product_service.soft_delete()
  project:  /api/v1/projects/{id} → project_service.delete()
  user:     /api/v1/admin/users/{id} → (仅 admin) user_service.deactivate()
  supplier: /api/v1/suppliers/{id} → supplier_service.soft_delete()
  design:   /api/v1/design-files/{id} → design_service.delete()
  cert:     /api/v1/certifications/{id} → cert_service.delete()
  firmware: /api/v1/firmware/versions/{id} → firmware_service.delete()
```

### H5 — 下沉 is_active (programmer, S, 1h)

```
文件: backend/app/repositories/user_repo.py
变更: get_by_id() 增加 WHERE is_active=True 过滤
文件: backend/app/core/deps.py
变更: line 50 移除 user.is_active 检查（已由仓库层保证）
```

### F-H3/F-H7 — 前端小重构 (ui-designer, S, 2h)

```
authStore.ts             → import type { User } from "services/api-types"; 移除重复声明
locales/index.ts         → useLocale() 改为 useAppStore(s => s.language) 而非 localStorage
```

### F-H4 — API Mock 剥离 (ui-designer, M, 4h)

```
api.ts: getLifecycleAnalytics() 移除 175 行模拟数据
→ 改为调用真实后端 /api/v1/analytics/lifecycle （若后端缺则抛出显式错误）
```

### F-H2/F-H5 — Dashboard 重构 (ui-designer, L, 14h)

```
EnhancedDashboard.tsx 拆分方案:
  1. StatCardGroup.tsx     — 顶部统计卡片（独立组件）
  2. WidgetGrid.tsx        — 可拖拽网格布局（@dnd-kit 逻辑）
  3. ModuleDrawer.tsx      — 模块可见性抽屉
  4. ChartWidgets.tsx      — ECharts 图表小组件
  5. DashboardStore.ts (新) — 布局持久化状态（zustand 替代 localStorage）
```

### F-H1 — 样式迁移 (ui-designer, M, 5h)

```
扫描 MainLayout/EnhancedDashboard 中所有:
  - style={{...}} 内联样式
  - color: #xxxxxx 硬编码色值
  → 替换为 tokens.ts CSS 变量或 theme.preset.cssVariables 引用
```

### F-H6 — CSS 选择器 (ui-designer, S, 2h)

```
global.css 中 [data-theme="linear-dark"] 检查:
  确认选择器与 ThemeProvider.setAttribute("data-theme", preset.id) 的值一致
  若预设 id 含中划线需要转义处理
```

---

## 五、风险 & 依赖预警

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| F-B1 (Cookie迁移) 需要后端配合 Set-Cookie 响应头 | 阶段2 H2/H3 依赖阻塞 | 后端 B1/B2 先完成，与前端同步推进 F-B1 |
| F-B2 (i18n) 涉及 463 行超大文件 | 容易遗漏某些字符串 | 建议用 `rg 中文` 搜索全部硬编码字面量后再替换 |
| H2 涉及 verify_token sync→async 改造 | 影响所有路由的认证性能 | 可改为 sync 调用 Redis 直连（非必要 async），或在 deps.py 单独检查 |
| H4 批量 DELETE 涉及所有资源 | 服务层可能缺少删除方法 | 统一提供 `Service.soft_delete(id) → bool` 模式 |

---

## 六、验收标准

```
Phase 1 Done ✅: 所有 P0 任务完成，基础认证流无安全漏洞，业务异常返回正确状态码
Phase 2 Done ✅: Token 吊销机制完整，飞书通知不再硬编码，is_active 校验在仓库层
Phase 3 Done ✅: 所有 7 个资源均支持 DELETE，前端 API 层完整覆盖
Phase 4 Done ✅: Dashboard 无 mock 数据、已拆分、样式使用 token 系统，i18n 覆盖率 100%
```
