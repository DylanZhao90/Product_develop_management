/**
 * EnhancedDashboard — 科技感可拖拽仪表盘 + 数据分析双视图
 *
 * Tabs: [总揽] [数据分析]
 *   - 总揽: original draggable dashboard with stat cards, widgets
 *   - 数据分析: full lifecycle analytics with 5 stage cards,
 *              Sankey flow, and per-stage deep-dive panels
 *
 * Integrates with project API, theming, i18n, and routing.
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Col,
  Row,
  Typography,
  Skeleton,
  Drawer,
  Button,
  Space,
  Switch,
  message,
  Tooltip,
  Tabs,
  Statistic,
  Tag,
} from "antd";
import {
  DragOutlined,
  PushpinOutlined,
  PushpinFilled,
  CloseOutlined,
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
  BarChartOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, analyticsApi } from "../../services/api";
import { useLocale } from "../../locales";
import { useEChartsColors } from "../../theme/echartsTheme";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import {
  BarChart,
  LineChart,
  PieChart,
  SankeyChart,
} from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { LifecycleAnalyticsData, LifecycleStatus, LifecycleStageAnalytics, DashboardStats } from "../../services/api-types";
import { buildMockLifecycleAnalyticsData } from "../../services/__mocks__/lifecycleAnalytics";

// ── Register ECharts components ──
echarts.use([
  BarChart, LineChart, PieChart, SankeyChart,
  GridComponent, TooltipComponent, LegendComponent, CanvasRenderer,
]);

// DnD Kit
import {
  DndContext,
  closestCenter,
  DragOverlay,
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  CSS,
  type DragStartEvent,
  type DragEndEvent,
} from "./dndImports";

import "../../styles/dashboard-enhanced.css";

// Extracted modules
import StatCards from "./widgets/StatCards";
import ActivityFeed from "./widgets/ActivityFeed";
import LifecyclePanorama from "./widgets/LifecyclePanorama";
import { LifecycleChart, ProgressChart } from "./widgets/ChartWidgets";
import ProductTable from "./widgets/ProductTable";
import {
  loadLayout,
  saveLayout,
  DEFAULT_WIDGETS,
  type LayoutState,
  type WidgetConfig,
} from "./hooks/useDashboardLayout";

// ═══════════════════════════════════════════════════════════════
// Shared Analytics Constants & Helpers
// ═══════════════════════════════════════════════════════════════

const STAGE_META: Record<LifecycleStatus, { color: string; icon: string; order: number; labelKey: string }> = {
  in_development:  { color: "#3b82f6", icon: "🔬", order: 0, labelKey: "product.status.in_development" },
  trial_handover:  { color: "#f59e0b", icon: "🧪", order: 1, labelKey: "product.status.trial_handover" },
  on_sale:         { color: "#22c55e", icon: "🚀", order: 2, labelKey: "product.status.on_sale" },
  discontinued:    { color: "#ef4444", icon: "⏸️", order: 3, labelKey: "product.status.discontinued" },
  eol:             { color: "#6b7280", icon: "🏁", order: 4, labelKey: "product.status.eol" },
};

const STAGE_ORDER: LifecycleStatus[] = [
  "in_development", "trial_handover", "on_sale", "discontinued", "eol",
];

const STAGE_APPROVAL_NODES: Record<LifecycleStatus, { name: string; key: string }[]> = {
  in_development: [
    { name: "产品立项", key: "kickoff" },
    { name: "技术评审", key: "tech_review" },
    { name: "样机测试", key: "prototype_test" },
    { name: "试产审批", key: "trial_approval" },
  ],
  trial_handover: [
    { name: "试产申请", key: "trial_app" },
    { name: "质量检测", key: "quality_check" },
    { name: "试产评审", key: "trial_review" },
    { name: "量产审批", key: "production_approval" },
  ],
  on_sale: [
    { name: "上市审批", key: "launch_app" },
    { name: "价格审核", key: "price_review" },
    { name: "渠道确认", key: "channel_confirm" },
    { name: "上架发布", key: "release" },
  ],
  discontinued: [
    { name: "停产申请", key: "eol_app" },
    { name: "库存评估", key: "inventory_asses" },
    { name: "客户通知", key: "customer_notify" },
    { name: "正式停产", key: "formal_eol" },
  ],
  eol: [
    { name: "退市评估", key: "sunset_app" },
    { name: "售后方案", key: "service_plan" },
    { name: "法规确认", key: "legal_confirm" },
    { name: "正式退市", key: "formal_retire" },
  ],
};

// ── ECharts option makers (label: { show: true } always) ──

function makeLineOption(
  xData: string[],
  series: { name: string; data: number[]; color: string }[],
  area = true,
) {
  return {
    tooltip: { trigger: "axis" as const },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: { left: "6%", right: "6%", bottom: "22%", top: "6%" },
    xAxis: {
      type: "category" as const,
      data: xData,
      axisLabel: { fontSize: 10 },
      axisLine: { lineStyle: {} },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { type: "dashed" as const } },
    },
    series: series.map((s) => ({
      type: "line" as const,
      name: s.name,
      data: s.data,
      smooth: true,
      symbol: "circle" as const,
      symbolSize: 6,
      lineStyle: { width: 2, color: s.color },
      itemStyle: { color: s.color },
      areaStyle: area
        ? {
            color: {
              type: "linear" as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${s.color}30` },
                { offset: 1, color: `${s.color}05` },
              ],
            },
          }
        : undefined,
      label: {
        show: true,
        position: "top" as const,
        fontSize: 10,
        fontWeight: 600,
      },
    })),
  };
}

function makeBarOption(xData: string[], yData: number[], color: string) {
  return {
    tooltip: { trigger: "axis" as const },
    grid: { left: "8%", right: "6%", bottom: "14%", top: "6%" },
    xAxis: {
      type: "category" as const,
      data: xData,
      axisLabel: { fontSize: 10 },
      axisLine: { lineStyle: {} },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { type: "dashed" as const } },
    },
    series: [
      {
        type: "bar" as const,
        barWidth: "50%",
        data: yData,
        itemStyle: { color, borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: "top" as const,
          fontSize: 11,
          fontWeight: 600,
        },
        emphasis: { itemStyle: { shadowBlur: 6, shadowColor: `${color}40` } },
      },
    ],
  };
}

function makePieOption(data: { name: string; value: number }[], colors: string[]) {
  return {
    tooltip: {
      trigger: "item" as const,
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    series: [
      {
        type: "pie" as const,
        radius: ["30%", "62%"],
        center: ["50%", "42%"],
        data: data.map((d, i) => ({
          ...d,
          itemStyle: { color: colors[i % colors.length] },
        })),
        label: {
          show: true,
          formatter: "{b}\n{d}%",
          fontSize: 10,
          fontWeight: 600,
        },
        labelLine: { length: 6, length2: 8 },
        emphasis: {
          itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.15)" },
        },
      },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════
// Analytics Sub-components
// ═══════════════════════════════════════════════════════════════

// ── Stage Stat Card ──
function StageStatCard({
  status,
  count,
  pct,
  active,
  onClick,
}: {
  status: LifecycleStatus;
  count: number;
  pct: string;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useLocale();
  const meta = STAGE_META[status];
  return (
    <Col xs={12} sm={8} lg={4} xl={4}>
      <Card
        hoverable
        className="stage-stat-card"
        onClick={onClick}
        style={
          active
            ? {
                borderColor: meta.color,
                boxShadow: `0 0 0 1px ${meta.color}20, 0 4px 20px ${meta.color}10`,
              }
            : {}
        }
        styles={{ body: { padding: "16px 12px" } }}
      >
        <div
          className="pdm-stat-icon"
          style={{
            background: `${meta.color}18`,
            color: meta.color,
            width: 40,
            height: 40,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 8px",
            fontSize: 18,
          }}
        >
          {meta.icon}
        </div>
        <div
          className="stage-stat-count"
          style={{
            color: meta.color,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: -1,
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          {count}
        </div>
        <div
          className="stage-stat-label"
          style={{
            fontSize: 12,
            fontWeight: 500,
            marginTop: 2,
            textAlign: "center",
          }}
        >
          {t(meta.labelKey)}
        </div>
        <Tag
          style={{
            display: "block",
            margin: "4px auto 0",
            width: "fit-content",
            fontSize: 11,
            fontWeight: 600,
          }}
          color={meta.color}
        >
          {pct}
        </Tag>
      </Card>
    </Col>
  );
}

// ── Sankey Flow Diagram ──
function LifecycleSankey({
  flows,
  totalProducts,
}: {
  flows: LifecycleAnalyticsData["flows"];
  totalProducts: number;
}) {
  const { t } = useLocale();
  const nodes = STAGE_ORDER.map((s) => ({
    name: t(STAGE_META[s].labelKey),
    itemStyle: { color: STAGE_META[s].color },
  }));

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: "item" as const,
        formatter: (p: { data: { source: string; target: string; value: number } }) => {
          const val = p.data.value;
          const rate = totalProducts > 0 ? ((val / totalProducts) * 100).toFixed(1) : "0";
          return t("dashboard.stage.flowTooltip", { source: p.data.source, target: p.data.target, count: val, rate });
        },
      },
      series: [
        {
          type: "sankey" as const,
          layout: "none" as const,
          layoutIterations: 0,
          emphasis: { focus: "adjacency" as const },
          nodeAlign: "left" as const,
          nodeWidth: 28,
          nodeGap: 12,
          left: 60,
          right: 100,
          top: 10,
          bottom: 10,
          data: nodes,
          links: flows.map((f) => {
            const fromName = t(STAGE_META[f.from].labelKey);
            const toName = t(STAGE_META[f.to].labelKey);
            const rate = totalProducts > 0
              ? ((f.count / totalProducts) * 100).toFixed(1)
              : "0";
            return {
              source: fromName,
              target: toName,
              value: f.count,
              label: {
                show: true,
                formatter: `${f.count} | ${rate}%`,
                fontSize: 11,
                fontWeight: 700,
              },
            };
          }),
          label: {
            show: true,
            position: 'right',
            fontSize: 14,
            fontWeight: 600,
          },
          lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.6 },
        },
      ],
    }),
    [flows, totalProducts],
  );

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ height: 220 }}
    />
  );
}

// ── Approval Timeline (per-product flows) ──
function ApprovalTimeline({
  stageKey,
  stage,
}: {
  stageKey: LifecycleStatus;
  stage: LifecycleStageAnalytics;
}) {
  const { t } = useLocale();
  const nodes = STAGE_APPROVAL_NODES[stageKey];
  const meta = STAGE_META[stageKey];
  const products = stage.products || [];

  // Per-product approval states (deterministic from product index)
  function getProductStatuses(productIdx: number) {
    return nodes.map((_, nodeIdx) => {
      const hash = (productIdx * 7 + nodeIdx * 13 + stageKey.charCodeAt(0)) % 3;
      return hash === 0 ? "passed" as const : hash === 1 ? "active" as const : "pending" as const;
    });
  }

  const visibleProducts = products.slice(0, 6);

  return (
    <div style={{ marginTop: 12 }}>
      <div
        className="pdm-panorama-section-title"
        style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, display: "inline-block" }} />
        {t("dashboard.stage.approvalFlow")} ({products.length} {t("lifecycle.panorama.products")})
      </div>
      {visibleProducts.length === 0 ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t("dashboard.noProductData")}</Typography.Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleProducts.map((product, pIdx) => {
            const statuses = getProductStatuses(pIdx);
            return (
              <div key={product.code || product.name || pIdx} style={{
                padding: "8px 10px", borderRadius: 8,
                background: "var(--color-bg-page)", border: "1px solid var(--color-border-light)",
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--color-text)" }}>
                  {product.code || product.name || t("dashboard.productFallback", { idx: pIdx + 1 })}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, overflowX: "auto", paddingBottom: 4 }}>
                  {nodes.map((node, nIdx) => (
                    <React.Fragment key={node.key}>
                      {nIdx > 0 && (
                        <div style={{
                          flex: "0 0 16px", height: 2,
                          background: statuses[nIdx - 1] === "passed" ? meta.color : "#e2e8f0",
                          borderRadius: 1,
                        }} />
                      )}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, minWidth: 40 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: statuses[nIdx] === "passed" ? meta.color
                            : statuses[nIdx] === "active" ? "#f59e0b" : "#e2e8f0",
                          boxShadow: statuses[nIdx] === "active" ? `0 0 0 3px ${meta.color}33` : "none",
                          transition: "all 0.2s",
                        }} />
                        <span style={{ fontSize: 9, color: "#94a3b8", marginTop: 3, whiteSpace: "nowrap" }}>{node.name}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
          {products.length > 6 && (
            <Typography.Text type="secondary" style={{ fontSize: 11, textAlign: "center" }}>
              {t("dashboard.productMore", { count: products.length - 6 })}
            </Typography.Text>
          )}
        </div>
      )}
    </div>
  );
}

// ── Per-Stage Deep Dive Panel ──
function StageDeepDivePanel({
  data,
  stageKey,
}: {
  data: LifecycleAnalyticsData;
  stageKey: LifecycleStatus;
}) {
  const { t } = useLocale();
  const stage = data[stageKey];
  const meta = STAGE_META[stageKey];

  if (!stage || stage.count === 0) {
    return (
      <Card
        className="stage-panel-card"
        style={{
          borderRadius: 14,
          border: "1px solid var(--color-border-light)",
          marginBottom: 24,
        }}
        styles={{ body: { padding: "20px" } }}
      >
        <div
          className="stage-card-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <span
            className="stage-badge"
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: meta.color,
              flexShrink: 0,
            }}
          />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            {meta.icon} {t(meta.labelKey)}
          </h3>
          <span
            className="stage-count"
            style={{
              marginLeft: "auto",
              fontSize: 12,
              fontWeight: 600,
              padding: "2px 10px",
              borderRadius: 12,
              background: `${meta.color}12`,
              color: meta.color,
            }}
          >
            {t("dashboard.stage.zeroProducts")}
          </span>
        </div>
        <div
          className="stage-empty"
          style={{ textAlign: "center", padding: "32px 0" }}
        >
          <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>
        </div>
      </Card>
    );
  }

  const entryMonths = stage.entries.map((e) => e.month.slice(5));
  const entryCounts = stage.entries.map((e) => e.count);
  const durRanges = stage.duration_distribution.map((d) => d.range);
  const durCounts = stage.duration_distribution.map((d) => d.count);

  const avgDuration =
    stage.products.length > 0
      ? Math.round(
          stage.products.reduce((sum, p) => sum + p.duration_days, 0) /
            stage.products.length,
        )
      : 0;
  const maxDuration =
    stage.products.length > 0
      ? Math.max(...stage.products.map((p) => p.duration_days))
      : 0;
  const totalEntries = stage.entries.reduce((sum, e) => sum + e.count, 0);
  const recentTrend =
    entryCounts.length >= 2
      ? entryCounts[entryCounts.length - 1] -
        entryCounts[entryCounts.length - 2]
      : 0;

  return (
    <Card
      className="stage-panel-card"
      style={{
        borderRadius: 14,
        border: "1px solid var(--color-border-light)",
        marginBottom: 24,
      }}
      styles={{ body: { padding: "20px" } }}
    >
      {/* Header */}
      <div
        className="stage-card-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <span
          className="stage-badge"
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: meta.color,
            flexShrink: 0,
            boxShadow: `0 0 8px ${meta.color}60`,
          }}
        />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          {meta.icon} {t(meta.labelKey)}
        </h3>
        <span
          className="stage-count"
          style={{
            marginLeft: "auto",
            fontSize: 12,
            fontWeight: 600,
            padding: "2px 10px",
            borderRadius: 12,
            background: `${meta.color}12`,
            color: meta.color,
          }}
        >
          {stage.count} {t("lifecycle.panorama.products")}
        </span>
      </div>

      {/* Row 1: Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <div
            className="stage-metric-card"
            style={{
              padding: "12px 14px",
              background: "var(--color-bg-page)",
              borderRadius: 10,
              borderLeft: `3px solid ${meta.color}`,
            }}
          >
            <Statistic
              title={t("dashboard.stats.productCount")}
              value={stage.count}
              valueStyle={{ fontSize: 22, fontWeight: 700, color: meta.color }}
            />
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div
            className="stage-metric-card"
            style={{
              padding: "12px 14px",
              background: "var(--color-bg-page)",
              borderRadius: 10,
            }}
          >
            <Statistic
              title={t("dashboard.stats.avgDuration")}
              value={avgDuration}
              suffix={t("dashboard.stats.avgDurationSuffix")}
              valueStyle={{ fontSize: 22, fontWeight: 700 }}
            />
            <div style={{ fontSize: 11, marginTop: 2 }}>{t("dashboard.stats.maxDuration", { days: maxDuration })}</div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div
            className="stage-metric-card"
            style={{
              padding: "12px 14px",
              background: "var(--color-bg-page)",
              borderRadius: 10,
            }}
          >
            <Statistic
              title={t("dashboard.stats.monthlyAvg")}
              value={
                entryMonths.length > 0
                  ? Math.round(totalEntries / entryMonths.length)
                  : 0
              }
              suffix={t("dashboard.stats.monthlyAvgSuffix")}
              valueStyle={{ fontSize: 22, fontWeight: 700 }}
            />
            <div style={{ fontSize: 11, marginTop: 2 }}>
              {t("dashboard.stats.totalEntries", { count: totalEntries })}
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div
            className="stage-metric-card"
            style={{
              padding: "12px 14px",
              background: "var(--color-bg-page)",
              borderRadius: 10,
            }}
          >
            <Statistic
              title={t("dashboard.stats.recentTrend")}
              value={recentTrend >= 0 ? `+${recentTrend}` : `${recentTrend}`}
              valueStyle={{
                fontSize: 22,
                fontWeight: 700,
                color:
                  recentTrend >= 0 ? "var(--color-success)" : "var(--color-error)",
              }}
              prefix={recentTrend >= 0 ? "↑" : "↓"}
            />
            <div style={{ fontSize: 11, marginTop: 2 }}>{t("dashboard.stats.vsLastMonth")}</div>
          </div>
        </Col>
      </Row>

      {/* Row 2: Trend line + Duration distribution */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={14}>
          <div
            className="chart-card"
            style={{
              height: "100%",
              padding: 16,
              background: "var(--color-bg-page)",
              borderRadius: 10,
              border: "1px solid var(--color-border-light)",
            }}
          >
            <div
              className="chart-title-sm"
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: meta.color,
                  display: "inline-block",
                }}
              />
              📈 {t("dashboard.chart.monthlyTrend", { stage: t(meta.labelKey) })}
            </div>
            <div style={{ width: "100%", height: 190 }}>
              <ReactEChartsCore
                echarts={echarts}
                option={makeLineOption(entryMonths, [
                  {
                    name: t(meta.labelKey),
                    data: entryCounts,
                    color: meta.color,
                  },
                ])}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </Col>
        <Col xs={24} md={10}>
          <div
            className="chart-card"
            style={{
              height: "100%",
              padding: 16,
              background: "var(--color-bg-page)",
              borderRadius: 10,
              border: "1px solid var(--color-border-light)",
            }}
          >
            <div
              className="chart-title-sm"
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: meta.color,
                  display: "inline-block",
                }}
              />
              ⏱️ {t("dashboard.chart.durationDist")}
            </div>
            <div style={{ width: "100%", height: 190 }}>
              <ReactEChartsCore
                echarts={echarts}
                option={makeBarOption(durRanges, durCounts, meta.color)}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </Col>
      </Row>

      {/* Row 3: Stage-specific enrichment charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {getStageEnrichment(stageKey, stage)}
      </Row>

      {/* Row 4: Approval timeline */}
      <ApprovalTimeline stageKey={stageKey} stage={stage} />
    </Card>
  );
}

// ── Stage-specific enrichment charts (using mock data) ──
function getStageEnrichment(
  stageKey: LifecycleStatus,
  stage: LifecycleAnalyticsData[LifecycleStatus],
) {
  const colors = [
    "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
    "#6b7280", "#8b5cf6", "#f97316", "#06b6d4",
  ];

  switch (stageKey) {
    case "in_development": {
      const rndTypes = [
        { name: "硬件开发", value: Math.round(stage.count * 0.55) },
        { name: "固件开发", value: Math.round(stage.count * 0.25) },
        { name: "软件开发", value: Math.round(stage.count * 0.15) },
        { name: "测试验证", value: Math.round(stage.count * 0.05) },
      ];
      const phases = [
        { name: "概念", value: Math.round(stage.count * 0.2) },
        { name: "原型", value: Math.round(stage.count * 0.35) },
        { name: "验证", value: Math.round(stage.count * 0.30) },
        { name: "预试产", value: Math.round(stage.count * 0.15) },
      ];
      return (
        <>
          <Col xs={24} md={12}>
            <div
              className="chart-card"
              style={{
                padding: 16,
                background: "var(--color-bg-page)",
                borderRadius: 10,
                border: "1px solid var(--color-border-light)",
              }}
            >
              <div
                className="chart-title-sm"
                style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}
              >
                🔧 {t("dashboard.chart.rndResourceAlloc")}
              </div>
              <div style={{ height: 190 }}>
                <ReactEChartsCore
                  echarts={echarts}
                  option={makePieOption(rndTypes, [
                    colors[0], colors[6], colors[7], colors[1],
                  ])}
                  style={{ height: "100%" }}
                />
              </div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div
              className="chart-card"
              style={{
                padding: 16,
                background: "var(--color-bg-page)",
                borderRadius: 10,
                border: "1px solid var(--color-border-light)",
              }}
            >
              <div
                className="chart-title-sm"
                style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}
              >
                📊 {t("dashboard.chart.rndPhaseDist")}
              </div>
              <div style={{ height: 190 }}>
                <ReactEChartsCore
                  echarts={echarts}
                  option={makeBarOption(
                    phases.map((p) => p.name),
                    phases.map((p) => p.value),
                    colors[0],
                  )}
                  style={{ height: "100%" }}
                />
              </div>
            </div>
          </Col>
        </>
      );
    }

    case "trial_handover": {
      const successRate = [
        { name: "通过", value: Math.round(stage.count * 0.78) },
        { name: "退回", value: Math.round(stage.count * 0.15) },
        { name: "待审", value: Math.round(stage.count * 0.07) },
      ];
      return (
        <Col xs={24} md={12}>
          <div
            className="chart-card"
            style={{
              padding: 16,
              background: "var(--color-bg-page)",
              borderRadius: 10,
              border: "1px solid var(--color-border-light)",
            }}
          >
            <div
              className="chart-title-sm"
              style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}
            >
              ✅ {t("dashboard.chart.trialSuccessRate")}
            </div>
            <div style={{ height: 190 }}>
              <ReactEChartsCore
                echarts={echarts}
                option={makePieOption(successRate, [
                  colors[1], colors[3], colors[2],
                ])}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </Col>
      );
    }

    case "on_sale": {
      const typeData = [
        { name: "交流桩", value: Math.round(stage.count * 0.5) },
        { name: "直流桩", value: Math.round(stage.count * 0.35) },
        { name: "便携充", value: Math.round(stage.count * 0.15) },
      ];
      return (
        <Col xs={24} md={12}>
          <div
            className="chart-card"
            style={{
              padding: 16,
              background: "var(--color-bg-page)",
              borderRadius: 10,
              border: "1px solid var(--color-border-light)",
            }}
          >
            <div
              className="chart-title-sm"
              style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}
            >
              🔌 {t("dashboard.chart.productTypeDist")}
            </div>
            <div style={{ height: 190 }}>
              <ReactEChartsCore
                echarts={echarts}
                option={makePieOption(typeData, [
                  colors[0], colors[1], colors[6],
                ])}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </Col>
      );
    }

    case "discontinued": {
      const reasons = [
        { name: "市场变化", value: Math.round(stage.count * 0.35) },
        { name: "技术淘汰", value: Math.round(stage.count * 0.30) },
        { name: "法规变更", value: Math.round(stage.count * 0.15) },
        { name: "供应链", value: Math.round(stage.count * 0.12) },
        { name: "质量问题", value: Math.round(stage.count * 0.08) },
      ];
      return (
        <Col xs={24} md={12}>
          <div
            className="chart-card"
            style={{
              padding: 16,
              background: "var(--color-bg-page)",
              borderRadius: 10,
              border: "1px solid var(--color-border-light)",
            }}
          >
            <div
              className="chart-title-sm"
              style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}
            >
              ⛔ {t("dashboard.chart.discontinueReasons")}
            </div>
            <div style={{ height: 190 }}>
              <ReactEChartsCore
                echarts={echarts}
                option={makePieOption(reasons, [
                  colors[3], colors[2], colors[0], colors[6], colors[7],
                ])}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </Col>
      );
    }

    case "eol": {
      const supportStatus = [
        { name: "质保期", value: Math.round(stage.count * 0.20) },
        { name: "已过期", value: Math.round(stage.count * 0.45) },
        { name: "延保中", value: Math.round(stage.count * 0.35) },
      ];
      return (
        <Col xs={24} md={12}>
          <div
            className="chart-card"
            style={{
              padding: 16,
              background: "var(--color-bg-page)",
              borderRadius: 10,
              border: "1px solid var(--color-border-light)",
            }}
          >
            <div
              className="chart-title-sm"
              style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}
            >
              🛟 {t("dashboard.chart.eolSupportStatus")}
            </div>
            <div style={{ height: 190 }}>
              <ReactEChartsCore
                echarts={echarts}
                option={makePieOption(supportStatus, [
                  colors[1], colors[2], colors[4],
                ])}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </Col>
      );
    }

    default:
      return null;
  }
}

// ── Full Analytics View ──
function AnalyticsView() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [activeStage, setActiveStage] = useState<LifecycleStatus | null>(null);
  const [lifecycleData, setLifecycleData] = useState<LifecycleAnalyticsData | null>(null);

  useEffect(() => {
    // Use mock data directly since the backend endpoint may not be available
    const data = buildMockLifecycleAnalyticsData();
    setLifecycleData(data);
  }, []);

  if (!lifecycleData) {
    return (
      <Card style={{ marginTop: 16 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  const stageStats = STAGE_ORDER.map((s) => ({
    status: s,
    count: lifecycleData[s].count,
  }));
  const totalProducts = lifecycleData.total_products;
  // Filter out DAG cycle (trial_handover → in_development breaks Sankey)
  const filteredFlows = lifecycleData.flows.filter(
    (f) => f.from !== "trial_handover" || f.to !== "in_development"
  );

  return (
    <div style={{ marginTop: 16 }}>
      {/* Stage Overview Cards */}
      <div className="stage-overview-row" style={{ marginBottom: 24 }}>
        <Row gutter={[12, 12]}>
          {stageStats.map((s) => (
            <StageStatCard
              key={s.status}
              status={s.status}
              count={s.count}
              pct={
                totalProducts > 0
                  ? ((s.count / totalProducts) * 100).toFixed(1) + "%"
                  : "0%"
              }
              active={activeStage === s.status}
              onClick={() => navigate("/lifecycle?stage=" + s.status)}
            />
          ))}
        </Row>
      </div>

      {/* Sankey Flow */}
      <Card
        className="sankey-card"
        style={{
          borderRadius: 14,
          marginBottom: 24,
        }}
        styles={{ body: { padding: "20px" } }}
      >
        <div
          className="stage-card-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <span
            className="stage-badge"
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "linear-gradient(90deg, #3b82f6, #6b7280)",
              flexShrink: 0,
            }}
          />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            ♻️ 产品生命周期流转全景
          </h3>
          <span
            className="stage-count"
            style={{
              marginLeft: "auto",
              fontSize: 12,
              fontWeight: 600,
              padding: "2px 10px",
              borderRadius: 12,
              background: "var(--color-bg-page)",
            }}
          >
            {filteredFlows.length} 条流转
          </span>
        </div>
        {filteredFlows.length > 0 ? (
          <>
            <LifecycleSankey
              flows={filteredFlows}
              totalProducts={lifecycleData.total_products}
            />
            <Row
              gutter={[16, 8]}
              style={{
                marginTop: 12,
                borderTop: "1px solid var(--color-border-light)",
                paddingTop: 16,
              }}
            >
              {filteredFlows.map((f, i) => {
                const rate =
                  totalProducts > 0
                    ? ((f.count / totalProducts) * 100).toFixed(1)
                    : "0";
                return (
                  <Col key={i} xs={12} sm={8} md={4}>
                    <div
                      className="flow-rate-item"
                      style={{
                        textAlign: "center",
                        padding: "8px 4px",
                        borderRadius: 8,
                        background: "var(--color-bg-page)",
                      }}
                    >
                      <span
                        className="flow-rate-path"
                        style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}
                      >
                        <span style={{ color: STAGE_META[f.from].color }}>
                          {t(STAGE_META[f.from].labelKey)}
                        </span>
                        <span style={{ margin: "0 4px" }}>→</span>
                        <span style={{ color: STAGE_META[f.to].color }}>
                          {t(STAGE_META[f.to].labelKey)}
                        </span>
                      </span>
                      <span
                        className="flow-rate-value"
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          display: "block",
                          lineHeight: 1.2,
                        }}
                      >
                        {f.count}
                      </span>
                      <span
                        className="flow-rate-pct"
                        style={{ fontSize: 11, display: "block" }}
                      >
                        {rate}% of total
                      </span>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </>
        ) : (
          <Typography.Text type="secondary">暂无流转数据</Typography.Text>
        )}
      </Card>

      {/* Per-Stage Deep Dive Panels */}
      <div className="stage-dive-section" style={{ marginTop: 24 }}>
        {STAGE_ORDER.map((stageKey) => (
          <StageDeepDivePanel
            key={stageKey}
            data={lifecycleData}
            stageKey={stageKey}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Original Dashboard Sub-components
// ═══════════════════════════════════════════════════════════════

// ── Sortable Widget ──

function SortableWidget({ widget, children, onTogglePin, onHide, t }: {
  widget: WidgetConfig;
  children: React.ReactNode;
  onTogglePin: (id: string) => void;
  onHide: (id: string) => void;
  t: (key: string) => string;
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
          <h4>{t(widget.titleKey) || widget.defaultTitle}</h4>
          <div className="pdm-widget-actions">
            <Tooltip title={widget.pinned ? t("common.unpin") : t("common.pin")}>
              <button
                className={widget.pinned ? "pinned" : ""}
                onClick={(e) => { e.stopPropagation(); onTogglePin(widget.id); }}
              >
                {widget.pinned ? <PushpinFilled style={{ fontSize: 12 }} /> : <PushpinOutlined style={{ fontSize: 12 }} />}
              </button>
            </Tooltip>
            <Tooltip title={t("common.hide")}>
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

function DragOverlayContent({ id, title, t }: { id: string; title: string; t: (key: string) => string }) {
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
    queryFn: async () => {
      // Return mock stats directly (no backend available)
      return {
        data: {
          data: {
            active_products: 18,
            active_projects: 12,
            pending_tasks: 47,
            completed_tasks: 36,
          } as DashboardStats,
        },
      };
    },
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
    message.success({ content: `💾 ${t("dashboard.layoutSaved")}`, key: "layout-save", duration: 2 });
  }, [layout, t]);

  const handleReset = useCallback(() => {
    const fresh: LayoutState = {
      widgets: DEFAULT_WIDGETS.map((w) => ({ ...w })),
      order: DEFAULT_WIDGETS.map((w) => w.id),
    };
    setLayout(fresh);
    saveLayout(fresh);
    message.success({ content: `↺ ${t("dashboard.layoutReset")}`, key: "layout-reset", duration: 2 });
  }, [t]);

  // ── Render each widget by ID ──

  const renderWidget = (id: string) => {
    const w = widgetMap[id];
    if (!w) return null;

    let content: React.ReactNode = null;
    switch (id) {
      case "panorama":
        content = <LifecyclePanorama />;
        break;
      case "lifecycle":
        content = <LifecycleChart ec={ec} t={t} />;
        break;
      case "progress":
        content = <ProgressChart ec={ec} />;
        break;
      case "activity":
        content = <ActivityFeed stats={stats} loading={isLoading} />;
        break;
      case "products":
        content = <ProductTable t={t} />;
        break;
    }

    return (
      <Col xs={24} lg={w.defaultSpan} key={w.id}>
        <SortableWidget widget={w} onTogglePin={handleTogglePin} onHide={handleHide} t={t}>
          {isLoading && (id === "lifecycle" || id === "progress")
            ? <Skeleton active paragraph={{ rows: 4 }} />
            : content
          }
        </SortableWidget>
      </Col>
    );
  };

  // ── Overview tab content ──
  const overviewContent = (
    <div>
      {/* ── Stat Cards ── */}
      <StatCards stats={stats} loading={isLoading} ec={ec} onNavigate={navigate} t={t} />

      {/* ── Action Bar ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, margin: "16px 0" }}>
        <Button size="small" icon={<SaveOutlined />} onClick={handleSave} type="dashed">
          {t("common.saveLayout")}
        </Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} type="dashed">
          {t("common.reset")}
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
            <DragOverlayContent id={activeId} title={t(widgetMap[activeId].titleKey) || widgetMap[activeId].defaultTitle} t={t} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── Module Manager Drawer ── */}
      <Drawer
        title={t("dashboard.moduleManager")}
        placement="right"
        onClose={() => setModuleDrawerOpen(false)}
        open={moduleDrawerOpen}
        width={320}
        className="pdm-module-panel"
        footer={
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("dashboard.moduleHint")}
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
            <span className="pdm-module-name">{t(w.titleKey) || w.defaultTitle}</span>
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

  return (
    <div>
      {/* ── Page Header ── */}
      <div
        className="page-header pdm-dashboard-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}
      >
        <div>
          <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
            {t("menu.dashboard")}
          </Typography.Title>
          <Typography.Text className="page-header-desc">
            {t("dashboard.overview") || "产品开发生命周期概览"}
          </Typography.Text>
        </div>
        <Space size={8}>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => setModuleDrawerOpen(true)}
            type="text"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t("dashboard.modules")}
          </Button>
          <Tooltip title={t("common.saveLayout")}>
            <Button
              icon={<SaveOutlined />}
              onClick={handleSave}
              type="text"
              style={{ color: "var(--color-text-secondary)" }}
            />
          </Tooltip>
          <Tooltip title={t("common.resetLayout")}>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              type="text"
              style={{ color: "var(--color-text-secondary)" }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* ── Dual-View Tabs ── */}
      <Tabs
        defaultActiveKey="overview"
        size="large"
        items={[
          {
            key: "overview",
            label: (
              <span>
                <DashboardOutlined style={{ marginRight: 6 }} />
                {t("dashboard.tab.overview")}
              </span>
            ),
            children: overviewContent,
          },
          {
            key: "analytics",
            label: (
              <span>
                <BarChartOutlined style={{ marginRight: 6 }} />
                {t("dashboard.tab.analytics")}
              </span>
            ),
            children: <AnalyticsView />,
          },
        ]}
      />
    </div>
  );
}
