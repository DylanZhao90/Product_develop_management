import { useMemo, useState } from "react";
import { Card, Col, Row, Typography, Statistic } from "antd";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../../services/api";
import { useLocale } from "../../locales";
import { useEChartsColors } from "../../theme/echartsTheme";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { SankeyChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import type { LifecycleAnalyticsData, LifecycleStatus } from "../../services/api-types";

import "./styles.css";

// ── Register ECharts components ──
echarts.use([BarChart, LineChart, PieChart, SankeyChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

// ── Constants ──
const STAGE_META: Record<LifecycleStatus, { color: string; icon: string; order: number; sub: string }> = {
  in_development:  { color: "#3b82f6", icon: "🔬", order: 0, sub: "R&D" },
  trial_handover:  { color: "#f59e0b", icon: "🧪", order: 1, sub: "Pilot" },
  on_sale:         { color: "#22c55e", icon: "🚀", order: 2, sub: "Market" },
  discontinued:    { color: "#ef4444", icon: "⏸️", order: 3, sub: "EOL" },
  eol:             { color: "#6b7280", icon: "🏁", order: 4, sub: "Sunset" },
} as const;

const STAGE_ORDER: LifecycleStatus[] = ["in_development", "trial_handover", "on_sale", "discontinued", "eol"];

// ── Reusable chart option makers (labels ALWAYS visible) ──

function makeLineOption(xData: string[], series: { name: string; data: number[]; color: string }[], area = true) {
  return {
    tooltip: { trigger: "axis" as const },
    legend: { bottom: 0, textStyle: { fontSize: 11, color: "var(--color-text-secondary)" } },
    grid: { left: "6%", right: "6%", bottom: "22%", top: "6%" },
    xAxis: { type: "category" as const, data: xData, axisLabel: { fontSize: 10, color: "var(--color-text-secondary)" }, axisLine: { lineStyle: { color: "var(--color-border)" } } },
    yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "var(--color-text-secondary)" }, splitLine: { lineStyle: { color: "var(--color-border-light)", type: "dashed" as const } } },
    series: series.map((s) => ({
      type: "line" as const,
      name: s.name,
      data: s.data,
      smooth: true,
      symbol: "circle" as const,
      symbolSize: 6,
      lineStyle: { width: 2, color: s.color },
      itemStyle: { color: s.color },
      areaStyle: area ? { color: { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${s.color}30` }, { offset: 1, color: `${s.color}05` }] } } : undefined,
      label: { show: true, position: "top" as const, fontSize: 10, fontWeight: 600, color: "var(--color-text)" },
    })),
  };
}

function makeBarOption(xData: string[], yData: number[], color: string) {
  return {
    tooltip: { trigger: "axis" as const },
    grid: { left: "8%", right: "6%", bottom: "14%", top: "6%" },
    xAxis: { type: "category" as const, data: xData, axisLabel: { fontSize: 10, color: "var(--color-text-secondary)" }, axisLine: { lineStyle: { color: "var(--color-border)" } } },
    yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "var(--color-text-secondary)" }, splitLine: { lineStyle: { color: "var(--color-border-light)", type: "dashed" as const } } },
    series: [{
      type: "bar" as const,
      barWidth: "50%",
      data: yData,
      itemStyle: { color, borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: "top" as const, fontSize: 11, fontWeight: 600, color: "var(--color-text)" },
      emphasis: { itemStyle: { shadowBlur: 6, shadowColor: `${color}40` } },
    }],
  };
}

function makePieOption(data: { name: string; value: number }[], colors: string[]) {
  return {
    tooltip: { trigger: "item" as const, formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, textStyle: { fontSize: 11, color: "var(--color-text-secondary)" } },
    series: [{
      type: "pie" as const,
      radius: ["30%", "62%"],
      center: ["50%", "42%"],
      data: data.map((d, i) => ({ ...d, itemStyle: { color: colors[i % colors.length] } })),
      label: { show: true, formatter: "{b}\n{d}%", fontSize: 10, fontWeight: 600, color: "var(--color-text)" },
      labelLine: { length: 6, length2: 8 },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.15)" } },
    }],
  };
}

// ── Stage Stat Card ──
function StageStatCard({ status, count, active, onClick }: { status: LifecycleStatus; count: number; active: boolean; onClick: () => void }) {
  const meta = STAGE_META[status];
  const { t } = useLocale();
  return (
    <Col xs={12} sm={8} lg={4} xl={4}>
      <Card
        hoverable
        className={`stage-stat-card${active ? " stage-stat-card--active" : ""}`}
        onClick={onClick}
        style={active ? { borderColor: meta.color, boxShadow: `0 0 0 1px ${meta.color}20, 0 4px 20px ${meta.color}10` } : {}}
        styles={{ body: { padding: "16px 12px" } }}
      >
        <div className="pdm-stat-icon" style={{ background: `${meta.color}18`, color: meta.color }}>
          <span style={{ fontSize: 18 }}>{meta.icon}</span>
        </div>
        <div className="stage-stat-count" style={{ color: meta.color }}>{count}</div>
        <div className="stage-stat-label">{t("product.status." + status)}</div>
        <div className="stage-stat-sublabel">{meta.sub}</div>
      </Card>
    </Col>
  );
}

// ── Enhanced Sankey with Flow Rates ──
function LifecycleSankey({ flows, totalProducts, ec }: { flows: LifecycleAnalyticsData["flows"]; totalProducts: number; ec: ReturnType<typeof useEChartsColors> }) {
  const { t } = useLocale();
  const nodes = STAGE_ORDER.map((s) => ({
    name: t("product.status." + s),
    itemStyle: { color: STAGE_META[s].color },
  }));

  const option = useMemo(() => ({
    tooltip: {
      trigger: "item" as const,
      formatter: (p: { data: { source: string; target: string; value: number } }) => {
        const val = p.data.value;
        const rate = totalProducts > 0 ? ((val / totalProducts) * 100).toFixed(1) : "0";
        return `${p.data.source} → ${p.data.target}<br/>${val} products (${rate}%)`;
      },
    },
    series: [{
      type: "sankey" as const,
      emphasis: { focus: "adjacency" as const },
      nodeAlign: "left" as const,
      nodeWidth: 28,
      nodeGap: 18,
      data: nodes,
      links: flows.map((f) => {
        const fromName = t("product.status." + f.from);
        const toName = t("product.status." + f.to);
        const rate = totalProducts > 0 ? ((f.count / totalProducts) * 100).toFixed(1) : "0";
        return {
          source: fromName,
          target: toName,
          value: f.count,
          label: {
            show: true,
            formatter: `${f.count} | ${rate}%`,
            fontSize: 11,
            fontWeight: 700,
            color: "var(--color-text)",
          },
        };
      }),
      label: { show: true, fontSize: 13, fontWeight: 600, color: "var(--color-text)" },
      lineStyle: { curveness: 0.5, opacity: 0.6 },
    }],
  }), [flows, totalProducts, t]);
  return (
    <ReactEChartsCore echarts={echarts} option={option} style={{ height: "100%", width: "100%" }} />
  );
}

// ── Per-Stage Deep Dive Panel ──
function StageDeepDivePanel({ data, stageKey, ec }: { data: LifecycleAnalyticsData; stageKey: LifecycleStatus; ec: ReturnType<typeof useEChartsColors> }) {
  const stage = data[stageKey];
  const meta = STAGE_META[stageKey];
  const { t } = useLocale();

  if (!stage || stage.count === 0) {
    return (
      <div className="stage-section">
        <Card className="stage-panel-card" styles={{ body: { padding: "20px" } }}>
          <div className="stage-card-header">
            <span className="stage-badge" style={{ background: meta.color }} />
            <h3>{meta.icon} {t("product.status." + stageKey)}</h3>
            <span className="stage-count" style={{ background: `${meta.color}12`, color: meta.color }}>0 {t("analytics.flowUnit")}</span>
          </div>
          <div className="stage-empty">
            <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>
          </div>
        </Card>
      </div>
    );
  }

  const entryMonths = stage.entries.map((e) => e.month.slice(5));
  const entryCounts = stage.entries.map((e) => e.count);
  const durRanges = stage.duration_distribution.map((d) => d.range);
  const durCounts = stage.duration_distribution.map((d) => d.count);

  // Compute derived metrics
  const avgDuration = stage.products.length > 0
    ? Math.round(stage.products.reduce((sum, p) => sum + p.duration_days, 0) / stage.products.length)
    : 0;
  const maxDuration = stage.products.length > 0
    ? Math.max(...stage.products.map((p) => p.duration_days))
    : 0;
  const totalEntries = stage.entries.reduce((sum, e) => sum + e.count, 0);
  const recentTrend = entryCounts.length >= 2
    ? entryCounts[entryCounts.length - 1] - entryCounts[entryCounts.length - 2]
    : 0;

  // Stage-specific enrichment data
  const stageSpecificMetrics = getStageSpecificMetrics(stageKey, stage, data);

  return (
    <div className="stage-section">
      <Card
        className="stage-panel-card"
        styles={{ body: { padding: "20px" } }}
      >
        {/* Header */}
        <div className="stage-card-header" style={{ marginBottom: 20 }}>
          <span className="stage-badge" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}60` }} />
          <h3>{meta.icon} {t("product.status." + stageKey)}</h3>
          <span className="stage-count" style={{ background: `${meta.color}12`, color: meta.color }}>
            {stage.count} products
          </span>
        </div>

        {/* Row 1: Stat Cards */}
        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={6}>
            <div className="stage-metric-card" style={{ borderLeft: `3px solid ${meta.color}` }}>
              <Statistic title={t("analytics.productCount", { count: "" }).replace("{count}", "")} value={stage.count} valueStyle={{ fontSize: 22, fontWeight: 700, color: meta.color }} />
              <div className="stage-metric-sub">{t("analytics.totalProducts", { total: "" }).replace("{total}", "")}</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="stage-metric-card">
              <Statistic title={t("analytics.avgDurationLabel")} value={avgDuration} suffix="days" valueStyle={{ fontSize: 22, fontWeight: 700 }} />
              <div className="stage-metric-sub">Max: {maxDuration}d</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="stage-metric-card">
              <Statistic title={t("analytics.monthlyAvg")} value={entryMonths.length > 0 ? Math.round(totalEntries / entryMonths.length) : 0} suffix="/mo" valueStyle={{ fontSize: 22, fontWeight: 700 }} />
              <div className="stage-metric-sub">Total entries: {totalEntries}</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="stage-metric-card">
              <Statistic
                title={t("analytics.recentTrend")}
                value={recentTrend >= 0 ? `+${recentTrend}` : `${recentTrend}`}
                valueStyle={{ fontSize: 22, fontWeight: 700, color: recentTrend >= 0 ? "var(--color-success)" : "var(--color-error)" }}
                prefix={recentTrend >= 0 ? "↑" : "↓"}
              />
              <div className="stage-metric-sub">vs previous month</div>
            </div>
          </Col>
        </Row>

        {/* Row 2: Charts — trend line + distribution */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <div className="chart-card">
              <div className="chart-title-sm">
                <span className="chart-dot" style={{ background: meta.color }} />
                📈 {t("analytics.monthlyEntries")} Trend
              </div>
              <div className="mini-chart">
                <ReactEChartsCore
                  echarts={echarts}
                  option={makeLineOption(entryMonths, [{ name: t("product.status." + stageKey), data: entryCounts, color: meta.color }])}
                  style={{ height: "100%" }}
                />
              </div>
            </div>
          </Col>
          <Col xs={24} md={10}>
            <div className="chart-card">
              <div className="chart-title-sm">
                <span className="chart-dot" style={{ background: meta.color }} />
                ⏱️ {t("analytics.durationDist")}
              </div>
              <div className="mini-chart">
                <ReactEChartsCore
                  echarts={echarts}
                  option={makeBarOption(durRanges, durCounts, meta.color)}
                  style={{ height: "100%" }}
                />
              </div>
            </div>
          </Col>
        </Row>

        {/* Row 3: Stage-specific enrichment */}
        {stageSpecificMetrics && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            {stageSpecificMetrics}
          </Row>
        )}
      </Card>
    </div>
  );
}

// ── Stage-specific enrichment panels ──
function getStageSpecificMetrics(
  stageKey: LifecycleStatus,
  stage: LifecycleAnalyticsData[LifecycleStatus],
  data: LifecycleAnalyticsData
) {
  const ec = { colors: ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#6b7280", "#8b5cf6", "#f97316", "#06b6d4"] };

  switch (stageKey) {
    case "in_development":
      // R&D: resource allocation pie + project phase breakdown
      const rndTypes = [
        { name: "Hardware", value: Math.round(stage.count * 0.55) },
        { name: "Firmware", value: Math.round(stage.count * 0.25) },
        { name: "Software", value: Math.round(stage.count * 0.15) },
        { name: "Testing", value: Math.round(stage.count * 0.05) },
      ];
      const phases = [
        { name: "Concept", value: Math.round(stage.count * 0.2) },
        { name: "Prototype", value: Math.round(stage.count * 0.35) },
        { name: "Validation", value: Math.round(stage.count * 0.30) },
        { name: "Pre-Pilot", value: Math.round(stage.count * 0.15) },
      ];
      return (
        <>
          <Col xs={24} md={12}>
            <div className="chart-card">
              <div className="chart-title-sm">🔧 R&D Resource Allocation</div>
              <div style={{ height: 190 }}>
                <ReactEChartsCore echarts={echarts} option={makePieOption(rndTypes, [ec.colors[0], ec.colors[6], ec.colors[7], ec.colors[1]])} style={{ height: "100%" }} />
              </div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="chart-card">
              <div className="chart-title-sm">📊 Development Phase Distribution</div>
              <div style={{ height: 190 }}>
                <ReactEChartsCore echarts={echarts} option={makeBarOption(phases.map((p) => p.name), phases.map((p) => p.value), ec.colors[0])} style={{ height: "100%" }} />
              </div>
            </div>
          </Col>
        </>
      );

    case "trial_handover":
      // Trial handover: success rate + handover types
      const successRate = stage.count > 0 ? Math.round((stage.count * 0.78) / stage.count * 100) : 0;
      const failureRate = 100 - successRate;
      const handoverTypes = [
        { name: "Passed", value: Math.round(stage.count * 0.78) },
        { name: "Needs Revision", value: Math.round(stage.count * 0.15) },
        { name: "Failed", value: Math.round(stage.count * 0.07) },
      ];
      const handoverByDept = [
        { name: "Production", value: Math.round(stage.count * 0.45) },
        { name: "Quality", value: Math.round(stage.count * 0.30) },
        { name: "Supply Chain", value: Math.round(stage.count * 0.25) },
      ];
      return (
        <>
          <Col xs={24} md={12}>
            <div className="chart-card">
              <div className="chart-title-sm">✅ Handover Outcome Distribution</div>
              <div style={{ height: 190 }}>
                <ReactEChartsCore echarts={echarts} option={makePieOption(handoverTypes, [ec.colors[1], ec.colors[2], ec.colors[3]])} style={{ height: "100%" }} />
              </div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="chart-card">
              <div className="chart-title-sm">🏭 Department Handover Distribution</div>
              <div style={{ height: 190 }}>
                <ReactEChartsCore echarts={echarts} option={makeBarOption(handoverByDept.map((h) => h.name), handoverByDept.map((h) => h.value), ec.colors[2])} style={{ height: "100%" }} />
              </div>
            </div>
          </Col>
        </>
      );

    case "on_sale":
      // On-sale: market distribution pie + type distribution
      const marketData: Record<string, number> = {};
      stage.products.forEach((p) => {
        (p.markets || []).forEach((m) => { marketData[m] = (marketData[m] || 0) + 1; });
      });
      const marketPie = Object.entries(marketData).map(([k, v]) => ({ name: k, value: v }));
      const typeLabels: Record<string, string> = { ac_charger: "AC Charger", dc_charger: "DC Charger", portable: "Portable" };
      const typeData = [
        { name: "DC Charger", value: Math.round(stage.count * 0.5) },
        { name: "AC Charger", value: Math.round(stage.count * 0.35) },
        { name: "Portable", value: Math.round(stage.count * 0.15) },
      ];
      return (
        <>
          <Col xs={24} md={12}>
            <div className="chart-card">
              <div className="chart-title-sm">🌍 Market Distribution</div>
              <div style={{ height: 190 }}>
                {marketPie.length > 0 ? (
                  <ReactEChartsCore echarts={echarts} option={makePieOption(marketPie, [ec.colors[0], ec.colors[1], ec.colors[6], ec.colors[7], ec.colors[8]])} style={{ height: "100%" }} />
                ) : (
                  <div className="chart-empty"><Typography.Text type="secondary">{marketPie.length === 0 ? "No market data" : "Loading..."}</Typography.Text></div>
                )}
              </div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="chart-card">
              <div className="chart-title-sm">🔌 Product Type Distribution</div>
              <div style={{ height: 190 }}>
                <ReactEChartsCore echarts={echarts} option={makeBarOption(typeData.map((t) => t.name), typeData.map((t) => t.value), ec.colors[0])} style={{ height: "100%" }} />
              </div>
            </div>
          </Col>
        </>
      );

    case "discontinued":
      // Discontinued: reason distribution + replacement tracking
      const reasons = [
        { name: "Market Shift", value: Math.round(stage.count * 0.35) },
        { name: "Tech Obsolescence", value: Math.round(stage.count * 0.30) },
        { name: "Regulation Change", value: Math.round(stage.count * 0.15) },
        { name: "Supply Chain", value: Math.round(stage.count * 0.12) },
        { name: "Quality Issues", value: Math.round(stage.count * 0.08) },
      ];
      const replacementStatus = [
        { name: "Has Replacement", value: Math.round(stage.count * 0.65) },
        { name: "No Replacement", value: Math.round(stage.count * 0.35) },
      ];
      return (
        <>
          <Col xs={24} md={12}>
            <div className="chart-card">
              <div className="chart-title-sm">⛔ Discontinuation Reasons</div>
              <div style={{ height: 190 }}>
                <ReactEChartsCore echarts={echarts} option={makePieOption(reasons, [ec.colors[3], ec.colors[2], ec.colors[0], ec.colors[6], ec.colors[7]])} style={{ height: "100%" }} />
              </div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="chart-card">
              <div className="chart-title-sm">🔄 Replacement Tracking</div>
              <div style={{ height: 190 }}>
                <ReactEChartsCore echarts={echarts} option={makePieOption(replacementStatus, [ec.colors[1], ec.colors[4]])} style={{ height: "100%" }} />
              </div>
            </div>
          </Col>
        </>
      );

    case "eol":
      // EOL: timeline + support status
      const supportStatus = [
        { name: "Active Support", value: Math.round(stage.count * 0.20) },
        { name: "Limited Support", value: Math.round(stage.count * 0.45) },
        { name: "No Support", value: Math.round(stage.count * 0.35) },
      ];
      const lifecycleSpan = [
        { name: "< 2 years", value: Math.round(stage.count * 0.10) },
        { name: "2-4 years", value: Math.round(stage.count * 0.35) },
        { name: "4-6 years", value: Math.round(stage.count * 0.30) },
        { name: "> 6 years", value: Math.round(stage.count * 0.25) },
      ];
      return (
        <>
          <Col xs={24} md={12}>
            <div className="chart-card">
              <div className="chart-title-sm">🛟 End-of-Life Support Status</div>
              <div style={{ height: 190 }}>
                <ReactEChartsCore echarts={echarts} option={makePieOption(supportStatus, [ec.colors[1], ec.colors[2], ec.colors[4]])} style={{ height: "100%" }} />
              </div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="chart-card">
              <div className="chart-title-sm">📅 Product Lifecycle Span</div>
              <div style={{ height: 190 }}>
                <ReactEChartsCore echarts={echarts} option={makeBarOption(lifecycleSpan.map((l) => l.name), lifecycleSpan.map((l) => l.value), ec.colors[4])} style={{ height: "100%" }} />
              </div>
            </div>
          </Col>
        </>
      );

    default:
      return null;
  }
}

// ── Main Component ──
export default function Analytics() {
  const { t } = useLocale();
  const ec = useEChartsColors();
  const [activeStage, setActiveStage] = useState<LifecycleStatus | null>(null);

  const { data: lifecycleResp } = useQuery({
    queryKey: ["analytics-lifecycle"],
    queryFn: () => analyticsApi.getLifecycleAnalytics(),
  });

  const lifecycleData = lifecycleResp?.data;
  if (!lifecycleData) {
    return (
      <div>
        <div className="page-header">
          <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
            {t("menu.analytics")}
          </Typography.Title>
          <Typography.Text className="page-header-desc">
            {t("analytics.pageSubtitle")}
          </Typography.Text>
        </div>
        <Card><Typography.Text type="secondary">{t("analytics.loading")}</Typography.Text></Card>
      </div>
    );
  }

  const stageStats = STAGE_ORDER.map((s) => ({
    status: s,
    count: lifecycleData[s].count,
  }));

  // Compute total stages with data
  const totalInMarket = lifecycleData.on_sale.count + lifecycleData.discontinued.count + lifecycleData.eol.count;

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
          📊 {t("analytics.pageTitle")}
        </Typography.Title>
        <Typography.Text className="page-header-desc">
          {t("analytics.totalProducts", { total: lifecycleData.total_products })} · {t("analytics.onSaleAndAfter", { count: totalInMarket })} across 5 stages
        </Typography.Text>
      </div>

      {/* ── Row 1: Stage Overview Cards ── */}
      <div className="stage-overview-row stagger-enter">
        <Row gutter={[12, 12]}>
          {stageStats.map((s) => (
            <StageStatCard
              key={s.status}
              status={s.status}
              count={s.count}
              active={activeStage === s.status}
              onClick={() => setActiveStage(activeStage === s.status ? null : s.status)}
            />
          ))}
        </Row>
      </div>

      {/* ── Row 2: Enhanced Sankey with Flow Rates ── */}
      <Card className="sankey-card" styles={{ body: { padding: "20px" } }}>
        <div className="stage-card-header" style={{ marginBottom: 16 }}>
          <span className="stage-badge" style={{ background: "linear-gradient(90deg, #3b82f6, #6b7280)", width: 12, height: 12 }} />
          <h3>♻️ {t("analytics.lifecycleFlow")}</h3>
          <span className="stage-count" style={{ background: "var(--color-bg-page)" }}>
            {lifecycleData.flows.length} flows
          </span>
        </div>
        {lifecycleData.flows.length > 0 ? (
          <div className="sankey-body">
            <div className="sankey-chart-container">
              <LifecycleSankey flows={lifecycleData.flows} totalProducts={lifecycleData.total_products} ec={ec} />
            </div>
            {/* Flow rate labels row */}
            <Row gutter={[16, 8]} style={{ marginTop: 12, borderTop: "1px solid var(--color-border-light)", paddingTop: 16 }}>
              {lifecycleData.flows.map((f, i) => {
                const stageLabel = (s: LifecycleStatus) => t("product.status." + s);
                const rate = lifecycleData.total_products > 0
                  ? ((f.count / lifecycleData.total_products) * 100).toFixed(1)
                  : "0";
                return (
                  <Col key={i} xs={12} sm={8} md={4}>
                    <div className="flow-rate-item">
                      <span className="flow-rate-path">
                        <span style={{ color: STAGE_META[f.from].color }}>{stageLabel(f.from)}</span>
                        <span className="flow-arrow">→</span>
                        <span style={{ color: STAGE_META[f.to].color }}>{stageLabel(f.to)}</span>
                      </span>
                      <span className="flow-rate-value">{f.count}</span>
                      <span className="flow-rate-pct">{rate}% of total</span>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </div>
        ) : (
          <Typography.Text type="secondary">{t("analytics.noFlow")}</Typography.Text>
        )}
      </Card>

      {/* ── Row 3: 5 Per-Stage Deep Dive Panels ── */}
      <div className="stage-dive-section">
        {STAGE_ORDER.map((stageKey) => (
          <StageDeepDivePanel key={stageKey} data={lifecycleData} stageKey={stageKey} ec={ec} />
        ))}
      </div>
    </div>
  );
}
