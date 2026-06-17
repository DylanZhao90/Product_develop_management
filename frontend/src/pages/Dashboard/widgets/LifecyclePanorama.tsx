/**
 * LifecyclePanorama — Dashboard「生命周期全景」模块
 *
 * 5 个阶段卡片（研发中→试产移交→在售→停产→退市），
 * 每个卡片含阶段详情 + 审批节点时间线 + 阶段流转率。
 * 所有数据来自 mock (lifecycleAnalytics.ts)。
 */
import { useMemo } from "react";
import { Card, Col, Row, Statistic, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../../../services/api";
import type { LifecycleAnalyticsData, LifecycleStatus } from "../../../services/api-types";
import { useLocale } from "../../../locales";

// ═══════════════════════════════════════════════════════════════
// Constants — stage visuals
// ═══════════════════════════════════════════════════════════════

const STAGE_ORDER: LifecycleStatus[] = [
  "in_development",
  "trial_handover",
  "on_sale",
  "discontinued",
  "eol",
];

const STAGE_META: Record<LifecycleStatus, { color: string; icon: string; label: string }> = {
  in_development:  { color: "#3b82f6", icon: "🔬", label: "product.status.in_development" },
  trial_handover:  { color: "#f59e0b", icon: "🧪", label: "product.status.trial_handover" },
  on_sale:         { color: "#22c55e", icon: "🚀", label: "product.status.on_sale" },
  discontinued:    { color: "#ef4444", icon: "⏸️", label: "product.status.discontinued" },
  eol:             { color: "#6b7280", icon: "🏁", label: "product.status.eol" },
};

/** Stage-specific approval steps */
const APPROVAL_STEPS: Record<LifecycleStatus, { label: string; status: "done" | "pending" | "active" }[]> = {
  in_development: [
    { label: "创建", status: "done" },
    { label: "技术评审", status: "done" },
    { label: "样机测试", status: "active" },
    { label: "试产审批", status: "pending" },
  ],
  trial_handover: [
    { label: "试产计划", status: "done" },
    { label: "物料齐套", status: "done" },
    { label: "试产执行", status: "active" },
    { label: "试产评审", status: "pending" },
  ],
  on_sale: [
    { label: "定价审批", status: "done" },
    { label: "渠道上架", status: "done" },
    { label: "首批出货", status: "done" },
    { label: "市场推广", status: "active" },
  ],
  discontinued: [
    { label: "停产评估", status: "done" },
    { label: "客户通知", status: "active" },
    { label: "最后订单", status: "pending" },
    { label: "停产审批", status: "pending" },
  ],
  eol: [
    { label: "退市评估", status: "done" },
    { label: "客户补偿", status: "pending" },
    { label: "退市公告", status: "pending" },
    { label: "资产处置", status: "pending" },
  ],
};

/** Colors for approval step status */
const STEP_STATUS_COLORS = {
  done:    "#22c55e",
  active:  "#3b82f6",
  pending: "#d1d5db",
};

// ═══════════════════════════════════════════════════════════════
// Helper: compute avg stay days
// ═══════════════════════════════════════════════════════════════

function avgStayDays(stage: LifecycleAnalyticsData[LifecycleStatus]): number {
  const products = stage.products;
  if (!products || products.length === 0) return 0;
  const total = products.reduce((sum, p) => sum + p.duration_days, 0);
  return Math.round(total / products.length);
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

// ── Approval Timeline (CSS) ──

function ApprovalTimeline({
  steps,
}: {
  steps: { label: string; status: "done" | "pending" | "active" }[];
}) {
  return (
    <div className="pdm-panorama-timeline">
      {steps.map((step, i) => (
        <div
          key={i}
          className={`pdm-timeline-step ${step.status}`}
          style={{ "--step-color": STEP_STATUS_COLORS[step.status] } as React.CSSProperties}
        >
          <div className="pdm-timeline-dot-row">
            <span
              className="pdm-timeline-dot"
              style={{
                background: STEP_STATUS_COLORS[step.status],
                boxShadow: step.status === "active"
                  ? `0 0 0 3px ${STEP_STATUS_COLORS[step.status]}30`
                  : "none",
              }}
            />
            {i < steps.length - 1 && (
              <span
                className="pdm-timeline-line"
                style={{
                  background: steps[i + 1].status === "pending"
                    ? "#e5e7eb"
                    : STEP_STATUS_COLORS[step.status],
                }}
              />
            )}
          </div>
          <span
            className="pdm-timeline-label"
            style={{
              color: step.status === "pending" ? "#9ca3af" : "var(--color-text)",
              fontWeight: step.status === "active" ? 600 : 400,
            }}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Stage Card ──

function StageCard({
  stageKey,
  data,
  prevFlowRate,
}: {
  stageKey: LifecycleStatus;
  data: LifecycleAnalyticsData;
  prevFlowRate: string | null;
}) {
  const meta = STAGE_META[stageKey];
  const stage = data[stageKey];
  const { t } = useLocale();
  const avgDays = avgStayDays(stage);
  const steps = APPROVAL_STEPS[stageKey];

  return (
    <Col xs={24} sm={12} md={12} lg={8} xl={4} xxl={4}>
      <Card
        className="pdm-panorama-card"
        style={{
          height: "100%",
          borderTop: `3px solid ${meta.color}`,
        }}
        styles={{ body: { padding: "16px" } }}
      >
        {/* Stage header */}
        <div className="pdm-panorama-card-header">
          <span className="pdm-panorama-icon" style={{ fontSize: 20 }}>
            {meta.icon}
          </span>
          <div className="pdm-panorama-title-area">
            <Typography.Text strong style={{ fontSize: 13 }}>
              {t(meta.label)}
            </Typography.Text>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 11, display: "block", lineHeight: "1.2" }}
            >
              {stageKey === "in_development"
                ? "R&D"
                : stageKey === "trial_handover"
                  ? "Pilot"
                  : stageKey === "on_sale"
                    ? "Market"
                    : stageKey === "discontinued"
                      ? "EOL"
                      : "Sunset"}
            </Typography.Text>
          </div>
        </div>

        {/* Count + avg stay */}
        <div className="pdm-panorama-stats" style={{ margin: "8px 0 10px" }}>
          <div className="pdm-panorama-stat">
            <span className="pdm-panorama-stat-value" style={{ color: meta.color, fontSize: 22, fontWeight: 700 }}>
              {stage.count}
            </span>
            <span className="pdm-panorama-stat-label">{t("lifecycle.panorama.products")}</span>
          </div>
          <div className="pdm-panorama-divider-vertical" />
          <div className="pdm-panorama-stat">
            <span className="pdm-panorama-stat-value" style={{ fontSize: 18, fontWeight: 600 }}>
              {avgDays}
            </span>
            <span className="pdm-panorama-stat-label">{t("lifecycle.panorama.avgDays")}</span>
          </div>
        </div>

        {/* Flow rate */}
        {prevFlowRate !== null && (
          <div
            className="pdm-panorama-flow-rate"
            style={{
              marginBottom: 10,
              padding: "4px 10px",
              borderRadius: 6,
              background: `${meta.color}0d`,
              border: `1px solid ${meta.color}20`,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
            }}
          >
            <span style={{ fontSize: 12 }}>⬇</span>
            <span style={{ color: "var(--color-text-secondary)" }}>{t("lifecycle.panorama.flowRate")}</span>
            <span style={{ fontWeight: 700, color: meta.color }}>{prevFlowRate}</span>
          </div>
        )}
        {prevFlowRate === null && (
          <div
            className="pdm-panorama-flow-rate"
            style={{
              marginBottom: 10,
              padding: "4px 10px",
              borderRadius: 6,
              background: "#f0f0f0",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
            }}
          >
            <span style={{ fontSize: 12 }}>🏁</span>
            <span style={{ color: "var(--color-text-muted)" }}>{t("lifecycle.panorama.startStage")}</span>
          </div>
        )}

        {/* Approval timeline */}
        <div className="pdm-panorama-section-title">
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: meta.color,
              marginRight: 6,
            }}
          />
          {t("lifecycle.panorama.approvalSteps")}
        </div>
        <ApprovalTimeline steps={steps} />

        {/* Product list (compact) */}
        {stage.products && stage.products.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div
              className="pdm-panorama-section-title"
              style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}
            >
              {t("lifecycle.panorama.productList")}
            </div>
            <div className="pdm-panorama-products">
              {stage.products.slice(0, 4).map((p) => (
                <div key={p.code} className="pdm-panorama-product-item">
                  <TooltipLabel text={p.name} max={14} />
                  <span className="pdm-panorama-product-days">{p.duration_days}d</span>
                </div>
              ))}
              {stage.products.length > 4 && (
                <div className="pdm-panorama-product-more">
                  {t("lifecycle.panorama.more", { n: stage.products.length - 4 })}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </Col>
  );
}

/** Small helper: truncate with tooltip */
function TooltipLabel({ text, max }: { text: string; max: number }) {
  if (text.length <= max) return <span>{text}</span>;
  return (
    <Typography.Text
      ellipsis={{ tooltip: text }}
      style={{ maxWidth: 80, fontSize: 11, color: "var(--color-text-secondary)" }}
    >
      {text.slice(0, max)}…
    </Typography.Text>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function LifecyclePanorama() {
  const { t } = useLocale();

  const { data: lifecycleResp } = useQuery({
    queryKey: ["panorama-lifecycle"],
    queryFn: () => analyticsApi.getLifecycleAnalytics(),
  });

  const lifecycleData = lifecycleResp?.data;

  // Compute flow rates between stages
  const flowRates = useMemo(() => {
    if (!lifecycleData) return {} as Record<LifecycleStatus, string | null>;

    const rates: Record<LifecycleStatus, string | null> = {
      in_development: null, // starting stage
      trial_handover: null,
      on_sale: null,
      discontinued: null,
      eol: null,
    };

    const flows = lifecycleData.flows;

    // in_development → trial_handover
    const devToTrial = flows.find(
      (f) => f.from === "in_development" && f.to === "trial_handover"
    );
    const trialToDev = flows.find(
      (f) => f.from === "trial_handover" && f.to === "in_development"
    );
    if (devToTrial) {
      const total = (devToTrial?.count || 0) + (trialToDev?.count || 0);
      rates.trial_handover =
        total > 0
          ? ((devToTrial.count / total) * 100).toFixed(1) + "%"
          : "0%";
    }

    // trial_handover → on_sale
    const trialToSale = flows.find(
      (f) => f.from === "trial_handover" && f.to === "on_sale"
    );
    if (trialToSale) {
      const sourceCount = lifecycleData.trial_handover.count;
      rates.on_sale =
        sourceCount > 0
          ? ((trialToSale.count / sourceCount) * 100).toFixed(1) + "%"
          : "0%";
    }

    // on_sale → discontinued
    const saleToDisc = flows.find(
      (f) => f.from === "on_sale" && f.to === "discontinued"
    );
    if (saleToDisc) {
      const sourceCount = lifecycleData.on_sale.count;
      rates.discontinued =
        sourceCount > 0
          ? ((saleToDisc.count / sourceCount) * 100).toFixed(1) + "%"
          : "0%";
    }

    // discontinued → eol
    const discToEol = flows.find(
      (f) => f.from === "discontinued" && f.to === "eol"
    );
    if (discToEol) {
      const sourceCount = lifecycleData.discontinued.count;
      rates.eol =
        sourceCount > 0
          ? ((discToEol.count / sourceCount) * 100).toFixed(1) + "%"
          : "0%";
    }

    return rates;
  }, [lifecycleData]);

  if (!lifecycleData) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center" }}>
        <Typography.Text type="secondary">{t("lifecycle.panorama.loading")}</Typography.Text>
      </div>
    );
  }

  return (
    <div className="pdm-panorama-container">
      {/* Summary bar */}
      <div
        className="pdm-panorama-summary"
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 14,
          padding: "8px 12px",
          borderRadius: 8,
          background: "var(--color-bg-page)",
          fontSize: 12,
        }}
      >
        <span>
          {t("lifecycle.panorama.summary")} <strong>{lifecycleData.total_products}</strong>
        </span>
        <span>
          {t("lifecycle.panorama.onSaleAndAfter")}{" "}
          <strong>
            {lifecycleData.on_sale.count +
              lifecycleData.discontinued.count +
              lifecycleData.eol.count}
          </strong>
        </span>
        <span>
          {t("lifecycle.panorama.inDev")} <strong>{lifecycleData.in_development.count}</strong>
        </span>
      </div>

      {/* 5 stage cards */}
      <Row gutter={[12, 12]}>
        {STAGE_ORDER.map((stageKey, idx) => {
          // For the first stage, no previous flow
          const prevStage = idx > 0 ? STAGE_ORDER[idx - 1] : null;
          const prevFlowRate = prevStage ? flowRates[stageKey] : null;
          return (
            <StageCard
              key={stageKey}
              stageKey={stageKey}
              data={lifecycleData}
              prevFlowRate={prevFlowRate}
            />
          );
        })}
      </Row>
    </div>
  );
}
