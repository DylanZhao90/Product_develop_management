/**
 * EnhancedDashboard — 科技感可拖拽仪表盘
 *
 * Integrates with the project's existing API, theming, i18n, and routing.
 * Features:
 *   - Glassmorphism design with animated stat cards
 *   - Draggable widget grid via @dnd-kit
 *   - Layout persistence (localStorage)
 *   - Module visibility manager (drawer panel)
 *   - ECharts visualizations using useEChartsColors()
 *   - Pin/unpin widgets
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Col,
  Row,
  Typography,
  Skeleton,
  Tag,
  Drawer,
  Button,
  Space,
  Switch,
  message,
  Tooltip,
} from "antd";
import {
  AppstoreOutlined,
  ProjectOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  DragOutlined,
  PushpinOutlined,
  PushpinFilled,
  CloseOutlined,
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../../services/api";
import { useLocale } from "../../locales";
import { useEChartsColors } from "../../theme/echartsTheme";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { PieChart, BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

// Register ECharts components
echarts.use([PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

// DnD Kit
import {
  DndContext,
  closestCenter,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import "../../styles/dashboard-enhanced.css";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface WidgetConfig {
  id: string;
  titleKey: string;
  defaultTitle: string;
  visible: boolean;
  pinned: boolean;
  defaultSpan: 12 | 24; // Ant Design Col span
}

interface LayoutState {
  widgets: WidgetConfig[];
  order: string[];
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const LAYOUT_KEY = "pdm_dashboard_layout";

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "lifecycle", titleKey: "dashboard.lifecycleChart", defaultTitle: "产品生命周期分布", visible: true, pinned: false, defaultSpan: 12 },
  { id: "progress",  titleKey: "dashboard.progressChart",   defaultTitle: "项目进度看板",   visible: true, pinned: false, defaultSpan: 12 },
  { id: "activity",  titleKey: "dashboard.recentActivity",  defaultTitle: "最近动态",       visible: true, pinned: false, defaultSpan: 24 },
  { id: "products",  titleKey: "menu.products",             defaultTitle: "产品列表",       visible: true, pinned: false, defaultSpan: 24 },
];

const ACTIVITIES = [
  { text: "产品 AC-220-EU 通过 CE 认证",          time: "2 分钟前",  type: "success" },
  { text: "项目 DRC-150kW 研发阶段评审通过",        time: "15 分钟前", type: "success" },
  { text: "固件 v2.4.1 灰度升级完成 (87%)",        time: "1 小时前",  type: "info" },
  { text: "供应商 兴达电子 评级更新为 A 级",        time: "2 小时前",  type: "info" },
  { text: "DC-350-EU 项目延期风险 — 进度滞后 2 周", time: "3 小时前",  type: "warning" },
  { text: "ARC-22kW 试产报告提交，待审批",          time: "5 小时前",  type: "warning" },
  { text: "PF-3.3-JP 设计文件 v3 上传 (STEP/IGS)", time: "6 小时前",  type: "info" },
  { text: "FCC 认证即将到期 — DRC-150kW (7 天)",   time: "1 天前",   type: "error" },
];

const MOCK_PRODUCTS = [
  { code: "AC-220-EU", model: "ARC-7.2kW",  type: "AC Charger",   status: "on_sale",          market: "EU" },
  { code: "DC-480-US", model: "DRC-150kW",  type: "DC Charger",   status: "trial_handover",   market: "US" },
  { code: "PF-3.3-JP", model: "PFC-3.3kW",  type: "Portable",     status: "in_development",   market: "JP" },
  { code: "AC-740-CN", model: "ARC-22kW",   type: "AC Charger",   status: "on_sale",          market: "CN" },
  { code: "DC-350-EU", model: "DRC-350kW",  type: "DC Charger",   status: "in_development",   market: "EU" },
  { code: "PF-7.4-US", model: "PFC-7.4kW",  type: "Portable",     status: "discontinued",     market: "US" },
];

const STATUS_META: Record<string, { color: string; label: string }> = {
  in_development:  { color: "blue",   label: "研发中" },
  trial_handover:  { color: "orange", label: "试产移交" },
  on_sale:         { color: "green",  label: "在售" },
  discontinued:    { color: "red",    label: "停产" },
  eol:             { color: "default",label: "退市" },
};

const DOT_COLORS: Record<string, string> = {
  success: "#22C55E",
  warning: "#F59E0B",
  error:   "#EF4444",
  info:    "#6366F1",
};

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function loadLayout(): LayoutState {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { widgets: DEFAULT_WIDGETS.map((w) => ({ ...w })), order: DEFAULT_WIDGETS.map((w) => w.id) };
}

function saveLayout(layout: LayoutState) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function StatCards({ stats, loading, ec, onNavigate }: {
  stats: any;
  loading: boolean;
  ec: ReturnType<typeof useEChartsColors>;
  onNavigate: (path: string) => void;
}) {
  const items = [
    { key: "products",  title: "活跃产品", value: stats?.active_products ?? 0, icon: <AppstoreOutlined />, color: ec.primary,  path: "/products" },
    { key: "projects",  title: "活跃项目", value: stats?.active_projects ?? 0, icon: <ProjectOutlined />, color: ec.success,  path: "/projects" },
    { key: "tasks",     title: "待处理任务",value: stats?.pending_tasks ?? 0,  icon: <ClockCircleOutlined />, color: ec.warning, path: "/projects" },
    { key: "completed", title: "已完成任务",value: stats?.completed_tasks ?? 0,icon: <CheckCircleOutlined />, color: ec.colors[3], path: "/projects" },
  ];

  return (
    <Row gutter={[16, 16]}>
      {items.map((item, i) => (
        <Col xs={24} sm={12} lg={6} key={item.key}>
          <div className="pdm-animate-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <Card
              hoverable
              className="pdm-stat-card"
              onClick={() => onNavigate(item.path)}
              styles={{ body: { padding: "20px 24px" } }}
            >
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} title={{ width: "60%" }} />
              ) : (
                <>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${item.color}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, color: item.color, marginBottom: 12,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: 4 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: item.color }}>
                    {item.value}
                  </div>
                </>
              )}
            </Card>
          </div>
        </Col>
      ))}
    </Row>
  );
}

// ── Sortable Widget ──

function SortableWidget({ widget, children, onTogglePin, onHide }: {
  widget: WidgetConfig;
  children: React.ReactNode;
  onTogglePin: (id: string) => void;
  onHide: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: widget.pinned });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    height: "100%",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className="pdm-widget"
        styles={{ body: { padding: 0, flex: 1, display: "flex", flexDirection: "column" } }}
        style={{ height: "100%", cursor: widget.pinned ? "default" : undefined }}
      >
        <div className="pdm-widget-header" {...listeners} {...attributes}>
          <span className="pdm-drag-handle">{widget.pinned ? "📌" : "⋮⋮"}</span>
          <h4>{widget.defaultTitle}</h4>
          <div className="pdm-widget-actions">
            <Tooltip title={widget.pinned ? "取消固定" : "固定"}>
              <button
                className={widget.pinned ? "pinned" : ""}
                onClick={(e) => { e.stopPropagation(); onTogglePin(widget.id); }}
              >
                {widget.pinned ? <PushpinFilled style={{ fontSize: 12 }} /> : <PushpinOutlined style={{ fontSize: 12 }} />}
              </button>
            </Tooltip>
            <Tooltip title="隐藏">
              <button onClick={(e) => { e.stopPropagation(); onHide(widget.id); }}>
                <CloseOutlined style={{ fontSize: 12 }} />
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="pdm-widget-body">
          {children}
        </div>
      </Card>
    </div>
  );
}

// ── Drag Overlay ──

function DragOverlayContent({ id, title }: { id: string; title: string }) {
  return (
    <Card
      className="pdm-drag-overlay"
      styles={{ body: { padding: "16px 20px" } }}
      style={{ width: 400, borderRadius: 12, backdropFilter: "blur(20px)" }}
    >
      <Space>
        <DragOutlined style={{ color: "var(--color-primary)" }} />
        <span style={{ fontWeight: 600 }}>{title}</span>
      </Space>
    </Card>
  );
}

// ── Lifecycle Pie Chart ──

function LifecycleChart({ ec }: { ec: ReturnType<typeof useEChartsColors> }) {
  const option = useMemo(() => ({
    tooltip: {
      trigger: "item" as const,
      backgroundColor: "var(--color-bg-card)",
      borderColor: "var(--color-border)",
    },
    legend: {
      bottom: 0,
      textStyle: { color: "var(--color-text-secondary)", fontSize: 11 },
    },
    series: [{
      type: "pie",
      radius: ["45%", "70%"],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: "var(--color-bg-page)", borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: "bold" },
        itemStyle: { shadowBlur: 10, shadowColor: `${ec.primary}40` },
      },
      data: [
        { value: 5, name: "研发中",     itemStyle: { color: "#60A5FA" } },
        { value: 3, name: "试产移交",   itemStyle: { color: "#FBBF24" } },
        { value: 7, name: "在售",       itemStyle: { color: "#4ADE80" } },
        { value: 2, name: "停产",       itemStyle: { color: "#F87171" } },
        { value: 1, name: "退市",       itemStyle: { color: "#94A3B8" } },
      ],
    }],
  }), [ec]);

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: 220 }} />;
}

// ── Progress Bar Chart ──

function ProgressChart({ ec }: { ec: ReturnType<typeof useEChartsColors> }) {
  const option = useMemo(() => ({
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "var(--color-bg-card)",
      borderColor: "var(--color-border)",
    },
    grid: { left: "8%", right: "8%", bottom: "18%", top: "10%" },
    xAxis: {
      type: "category" as const,
      data: ["ARC-7.2kW", "DRC-150kW", "PFC-3.3kW", "ARC-22kW", "DRC-350kW"],
      axisLabel: { color: "var(--color-text-secondary)", fontSize: 10, rotate: 20 },
      axisLine: { lineStyle: { color: "var(--color-border)" } },
    },
    yAxis: {
      type: "value" as const,
      max: 100,
      axisLabel: { color: "var(--color-text-secondary)", fontSize: 10, formatter: "{value}%" },
      splitLine: { lineStyle: { color: "var(--color-border-light)", type: "dashed" as const } },
    },
    series: [{
      type: "bar",
      barWidth: "40%",
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: {
          type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: ec.primary },
            { offset: 1, color: `${ec.primary}60` },
          ],
        },
      },
      data: [
        { value: 100, itemStyle: { color: ec.success } },
        { value: 75 },
        { value: 30, itemStyle: { color: "#60A5FA" } },
        { value: 100, itemStyle: { color: ec.success } },
        { value: 15, itemStyle: { color: ec.warning } },
      ],
    }],
  }), [ec]);

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: 220 }} />;
}

// ── Activity Feed ──

function ActivityFeed() {
  return (
    <ul className="pdm-activity-list">
      {ACTIVITIES.map((a, i) => (
        <li className="pdm-activity-item" key={i}>
          <span
            className="pdm-activity-dot"
            style={{ background: DOT_COLORS[a.type], boxShadow: `0 0 6px ${DOT_COLORS[a.type]}` }}
          />
          <span className="pdm-activity-text">{a.text}</span>
          <span className="pdm-activity-time">{a.time}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Product Table ──

function ProductTable() {
  return (
    <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--color-border-light)" }}>
            产品编码
          </th>
          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--color-border-light)" }}>
            型号
          </th>
          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--color-border-light)" }}>
            类型
          </th>
          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--color-border-light)" }}>
            生命周期
          </th>
          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--color-border-light)" }}>
            目标市场
          </th>
        </tr>
      </thead>
      <tbody>
        {MOCK_PRODUCTS.map((p) => {
          const meta = STATUS_META[p.status] || { color: "default", label: p.status };
          return (
            <tr key={p.code}>
              <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--color-border-light)" }}>
                <Typography.Text strong style={{ fontSize: 13 }}>{p.code}</Typography.Text>
              </td>
              <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--color-border-light)" }}>
                {p.model}
              </td>
              <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--color-border-light)" }}>
                {p.type}
              </td>
              <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--color-border-light)" }}>
                <Tag color={meta.color}>{meta.label}</Tag>
              </td>
              <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--color-border-light)" }}>
                {p.market}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function EnhancedDashboard() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const ec = useEChartsColors();

  const [layout, setLayout] = useState<LayoutState>(loadLayout);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [moduleDrawerOpen, setModuleDrawerOpen] = useState(false);

  const { data: statsResp, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApi.getStats(),
  });
  const stats = statsResp?.data?.data;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const visibleWidgets = useMemo(
    () => layout.order.filter((id) => layout.widgets.find((w) => w.id === id)?.visible !== false),
    [layout],
  );

  const widgetMap = useMemo(
    () => Object.fromEntries(layout.widgets.map((w) => [w.id, w])),
    [layout],
  );

  // ── Persist on mount ──
  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  // ── Handlers ──

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over || active.id === over.id) return;

      const oldIdx = visibleWidgets.indexOf(String(active.id));
      const newIdx = visibleWidgets.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return;

      const reordered = arrayMove(visibleWidgets, oldIdx, newIdx);
      // Merge hidden widgets back
      const hidden = layout.order.filter((id) => !visibleWidgets.includes(id));
      setLayout((prev) => ({ ...prev, order: [...reordered, ...hidden] }));
    },
    [visibleWidgets, layout.order],
  );

  const handleTogglePin = useCallback((id: string) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === id ? { ...w, pinned: !w.pinned } : w)),
    }));
  }, []);

  const handleHide = useCallback((id: string) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === id ? { ...w, visible: false } : w)),
    }));
  }, []);

  const handleToggleVisibility = useCallback((id: string, visible: boolean) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === id ? { ...w, visible } : w)),
    }));
  }, []);

  const handleSave = useCallback(() => {
    saveLayout(layout);
    message.success({ content: "💾 布局已保存", key: "layout-save", duration: 2 });
  }, [layout]);

  const handleReset = useCallback(() => {
    const fresh: LayoutState = {
      widgets: DEFAULT_WIDGETS.map((w) => ({ ...w })),
      order: DEFAULT_WIDGETS.map((w) => w.id),
    };
    setLayout(fresh);
    saveLayout(fresh);
    message.success({ content: "↺ 布局已重置", key: "layout-reset", duration: 2 });
  }, []);

  // ── Render each widget by ID ──

  const renderWidget = (id: string) => {
    const w = widgetMap[id];
    if (!w) return null;

    let content: React.ReactNode = null;
    switch (id) {
      case "lifecycle":
        content = <LifecycleChart ec={ec} />;
        break;
      case "progress":
        content = <ProgressChart ec={ec} />;
        break;
      case "activity":
        content = <ActivityFeed />;
        break;
      case "products":
        content = <ProductTable />;
        break;
    }

    return (
      <Col xs={24} lg={w.defaultSpan} key={w.id}>
        <SortableWidget widget={w} onTogglePin={handleTogglePin} onHide={handleHide}>
          {isLoading && (id === "lifecycle" || id === "progress")
            ? <Skeleton active paragraph={{ rows: 4 }} />
            : content
          }
        </SortableWidget>
      </Col>
    );
  };

  return (
    <div>
      {/* ── Page Header ── */}
      <div
        className="page-header pdm-dashboard-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}
      >
        <div>
          <Typography.Title
            level={4}
            style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}
          >
            {t("menu.dashboard")}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 14 }}>
            {t("dashboard.overview") || "产品开发生命周期概览"}
          </Typography.Text>
        </div>
        <Space size={8}>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setModuleDrawerOpen(true)}
            type="text"
            style={{ color: "var(--color-text-secondary)" }}
          >
            模块
          </Button>
          <Tooltip title="保存布局">
            <Button
              icon={<SaveOutlined />}
              onClick={handleSave}
              type="text"
              style={{ color: "var(--color-text-secondary)" }}
            />
          </Tooltip>
          <Tooltip title="重置布局">
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              type="text"
              style={{ color: "var(--color-text-secondary)" }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* ── Stat Cards ── */}
      <StatCards stats={stats} loading={isLoading} ec={ec} onNavigate={navigate} />

      {/* ── Action Bar ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, margin: "16px 0" }}>
        <Button size="small" icon={<SaveOutlined />} onClick={handleSave} type="dashed">
          保存布局
        </Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} type="dashed">
          重置
        </Button>
      </div>

      {/* ── Draggable Widget Grid ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleWidgets} strategy={verticalListSortingStrategy}>
          <Row gutter={[16, 16]}>
            {visibleWidgets.map((id) => renderWidget(id))}
          </Row>
        </SortableContext>

        <DragOverlay>
          {activeId && widgetMap[activeId] ? (
            <DragOverlayContent id={activeId} title={widgetMap[activeId].defaultTitle} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── Module Manager Drawer ── */}
      <Drawer
        title="模块管理"
        placement="right"
        onClose={() => setModuleDrawerOpen(false)}
        open={moduleDrawerOpen}
        width={320}
        className="pdm-module-panel"
        footer={
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            💡 拖拽卡片可自由排列顺序 · 关闭的模块不会显示
          </Typography.Text>
        }
      >
        {layout.widgets.map((w) => (
          <div className="pdm-module-item" key={w.id}>
            <Switch
              checked={w.visible}
              onChange={(checked) => handleToggleVisibility(w.id, checked)}
              size="small"
            />
            <span className="pdm-module-name">{w.defaultTitle}</span>
            {w.pinned ? (
              <PushpinFilled style={{ fontSize: 11, color: "var(--color-primary)" }} />
            ) : (
              <DragOutlined style={{ fontSize: 11, color: "var(--color-text-muted)" }} />
            )}
          </div>
        ))}
      </Drawer>
    </div>
  );
}
