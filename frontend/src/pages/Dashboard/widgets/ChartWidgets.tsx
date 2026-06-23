/**
 * ChartWidgets — ECharts-based lifecycle pie chart and progress bar chart.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { PieChart, BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useEChartsColors } from "../../../theme/echartsTheme";
import { productApi } from "../../../services/api";
import type { LifecycleStatus } from "../../../services/api-types";

// Register ECharts components once
echarts.use([PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

// ── Status metadata helper ──

const STATUS_META_COLORS: Record<string, string> = {
  in_development:  "blue",
  trial_handover:  "orange",
  on_sale:         "green",
  discontinued:    "red",
  eol:             "default",
};

function getStatusMeta(t: (key: string) => string): Record<string, { color: string; label: string }> {
  return {
    in_development:  { color: STATUS_META_COLORS.in_development,  label: t("product.status.in_development") },
    trial_handover:  { color: STATUS_META_COLORS.trial_handover,  label: t("product.status.trial_handover") },
    on_sale:         { color: STATUS_META_COLORS.on_sale,         label: t("product.status.on_sale") },
    discontinued:    { color: STATUS_META_COLORS.discontinued,    label: t("product.status.discontinued") },
    eol:             { color: STATUS_META_COLORS.eol,             label: t("product.status.eol") },
  };
}

const STATUS_COLORS: Record<LifecycleStatus, string> = {
  in_development: "#60A5FA",
  trial_handover: "#FBBF24",
  on_sale:        "#4ADE80",
  discontinued:   "#F87171",
  eol:            "#94A3B8",
};

// ── Lifecycle Pie Chart ──

export function LifecycleChart({ ec, t }: { ec: ReturnType<typeof useEChartsColors>; t: (key: string) => string }) {
  const { data: prodResp } = useQuery({
    queryKey: ["lifecycle-chart-products"],
    queryFn: () => productApi.list({ page: 1, page_size: 100 }),
  });
  const products = prodResp?.data?.data ?? [];

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const status = p.lifecycle_status;
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [products]);

  const meta = getStatusMeta(t);

  const option = useMemo(() => {
    const dataKeys: LifecycleStatus[] = ["in_development", "trial_handover", "on_sale", "discontinued", "eol"];
    const chartData = dataKeys
      .filter((key) => (statusCounts[key] ?? 0) > 0)
      .map((key) => ({
        value: statusCounts[key] ?? 0,
        name: meta[key].label,
        itemStyle: { color: STATUS_COLORS[key] },
      }));

    return {
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
        label: { show: true, formatter: "{b}: {c}", fontSize: 11, fontWeight: 600, color: "var(--color-text)" },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: "bold" },
          itemStyle: { shadowBlur: 10, shadowColor: `${ec.primary}40` },
        },
        data: chartData,
      }],
    };
  }, [ec, meta, statusCounts]);

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: 220 }} />;
}

// ── Progress Bar Chart ──

export function ProgressChart({ ec }: { ec: ReturnType<typeof useEChartsColors> }) {
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
      label: { show: true, position: "top", formatter: "{c}%", fontSize: 11, fontWeight: 600, color: "var(--color-text)" },
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
