# PDM 项目文档

> **Product Development & Lifecycle Management (安纳瑞PDM)**
> 架构评审得分: **97.15/100 (A+)** — 企业级生产就绪
> 最后更新: 2026-06-14

---

## 快速导航

| 你想... | 看这个 |
|---------|--------|
| 🚀 部署上线 | [飞书部署指南](FEISHU_DEPLOYMENT_GUIDE.md) |
| 🏗 了解架构 | [架构设计概览](architecture/overview.md) |
| 📊 看评审结果 | [全面架构评审报告](COMPREHENSIVE_REVIEW.md) (97.15/100) |
| 🔧 运维排错 | [运维手册 (Runbook)](RUNBOOK.md) |
| 📐 查数据模型 | [ER 关系图](ER_DIAGRAM.md) |
| 🎯 理解决策 | [架构决策记录 (ADR)](ARCHITECTURE_DECISIONS.md) |

---

## 文档索引

### 核心文档

| 文档 | 说明 | 状态 |
|------|------|------|
| [COMPREHENSIVE_REVIEW.md](COMPREHENSIVE_REVIEW.md) | **全面架构与质量评审报告** — v1→v4 四轮迭代，最终 97.15/100 | ✅ v4 |
| [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) | **架构决策记录** — 9 份 ADR，含技术选型理由和 trade-off | ✅ |
| [ER_DIAGRAM.md](ER_DIAGRAM.md) | **数据库 ER 关系图** — 13 张表 + 外键 + 级联 + 复合索引 | ✅ |
| [RUNBOOK.md](RUNBOOK.md) | **运维手册** — 健康检查、备份恢复、故障排查、监控清单 | ✅ |
| [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) | **开发排期计划** — Phase 1-4 + v2/v3/v4 优化历程 | ✅ |
| [FEISHU_DEPLOYMENT_GUIDE.md](FEISHU_DEPLOYMENT_GUIDE.md) | **飞书部署上架指南** — 阿里云 ECS + Docker + Nginx + HTTPS | ✅ |

### 架构文档

| 文档 | 说明 |
|------|------|
| [architecture/overview.md](architecture/overview.md) | 系统架构概览：技术栈、分层设计、API 路由、状态机 |
| [architecture/architecture-diagram.md](architecture/architecture-diagram.md) | C4 架构图 |
| [architecture/business-architecture.md](architecture/business-architecture.md) | 业务架构与系统边界 |

### 设计与质量

| 文档 | 说明 |
|------|------|
| [DESIGN_BRIEF.md](DESIGN_BRIEF.md) | 设计简报：色彩/排版/动效/组件规范 |
| [AUDIT_REPORT.md](AUDIT_REPORT.md) | 前端 UI 质量审计报告 (92.9/100) |

### 阶段记录

| 文档 | 说明 | 完成日期 |
|------|------|---------|
| [PHASE_1.md](PHASE_1.md) | Phase 1 — 核心骨架与基础功能 | 2026-06-09 |
| [PHASE_2.md](PHASE_2.md) | Phase 2 — 设计协作与供应链管理 | 2026-06-11 |
| [PHASE_3.md](PHASE_3.md) | Phase 3 — 固件 OTA 与数据分析 | 2026-06-11 |
| [PHASE_4.md](PHASE_4.md) | Phase 4 — 系统集成与生产就绪 | 2026-06-12 |

### 演示文档

| 文档 | 说明 |
|------|------|
| [UI_DEMO_CHANGELOG.md](UI_DEMO_CHANGELOG.md) | 🎮 前端演示版本迭代记录 (独立演示项目，非生产系统) |

---

## 优化历程

| 轮次 | 日期 | 分数 | 关键工作 |
|------|------|------|---------|
| Phase 1-4 | 6/09-6/12 | — | 全功能开发 |
| 架构审查 | 6/12 | — | 20 项安全/逻辑/质量修复 |
| v2 优化 | 6/14 上午 | 80→84 | P0/P1/P2 修复 (异常体系/Pydantic/竞态/N+1) |
| v3 深度 | 6/14 下午 | 84→94 | 117测试 + 安全头 + CI/CD + 9 ADR |
| v4 冲刺 | 6/14 晚上 | 94→97 | httpOnly cookie + Prometheus + K8s + Playwright |

---

## 约定

- 架构变更同步更新 `architecture/overview.md`
- 新增 ADR 同步更新 `ARCHITECTURE_DECISIONS.md`
- 部署配置变更同步更新 `FEISHU_DEPLOYMENT_GUIDE.md` 和 `RUNBOOK.md`
- 所有文档保持单一事实来源，避免分散和过期
