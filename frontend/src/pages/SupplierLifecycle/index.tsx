import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Col, Row, Statistic, Steps, Tag, Typography, Space, Table, Button } from "antd";
import { CheckCircleFilled, ClockCircleFilled, MinusCircleFilled } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { projectApi } from "../../services/api";
import type { Project } from "../../services/api-types";
import { useLocale } from "../../locales";

// 6 supplier lifecycle phases in order
const SUPPLIER_PHASES = ["research", "evaluation", "onboarding", "cooperation", "termination", "blacklist"] as const;
export type SupplierPhase = (typeof SUPPLIER_PHASES)[number];

const phaseLabels: Record<string, Record<string, string>> = {
  research:    { "zh-CN": "考察调研",   "en-US": "Research" },
  evaluation:  { "zh-CN": "供应商评估",  "en-US": "Evaluation" },
  onboarding:  { "zh-CN": "供应商导入",  "en-US": "Onboarding" },
  cooperation: { "zh-CN": "合作管理",    "en-US": "Cooperation" },
  termination: { "zh-CN": "终止合作",    "en-US": "Termination" },
  blacklist:   { "zh-CN": "退出/黑名单", "en-US": "Blacklist" },
};

const phaseColors: Record<string, string> = {
  research:    "default",
  evaluation:  "blue",
  onboarding:  "cyan",
  cooperation: "green",
  termination: "orange",
  blacklist:   "red",
};

function getPhaseLabel(phase: string, lang: string): string {
  const entry = phaseLabels[phase];
  if (!entry) return phase;
  return entry[lang] || entry["en-US"] || phase;
}

export default function SupplierLifecycle() {
  const { t, lang } = useLocale();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["projects-supplier-lifecycle"],
    queryFn: () => projectApi.list({ page_size: 100 }),
  });

  const projects: Project[] = (data?.data?.data || []).filter(
    (p) => p.project_type_key === "supplier_management"
  );

  // Phase statistics
  const phaseStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const phase of SUPPLIER_PHASES) {
      stats[phase] = 0;
    }
    for (const p of projects) {
      const phase = p.lifecycle_phase || "research";
      if (stats[phase] !== undefined) stats[phase]++;
    }
    return stats;
  }, [projects]);

  const columns = [
    {
      title: t("supplier.name"),
      dataIndex: "supplier_name",
      key: "supplier_name",
      width: 240,
      ellipsis: true,
      render: (v: string, r: Project) => (
        <a onClick={() => navigate(`/projects/${r.id}`)}>{v || r.name}</a>
      ),
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v: string) => (
        <Tag color={v === "in_progress" ? "processing" : v === "completed" ? "green" : "default"}>
          {t(`project.status.${v}`)}
        </Tag>
      ),
    },
    {
      title: t("supplier.currentPhase"),
      key: "phase",
      width: 140,
      render: (_: unknown, r: Project) => {
        const phase = r.lifecycle_phase || "research";
        return (
          <Tag color={phaseColors[phase] || "default"}>
            {getPhaseLabel(phase, lang)}
          </Tag>
        );
      },
    },
    {
      title: t("common.actions"),
      key: "action",
      width: 120,
      render: (_: unknown, r: Project) => (
        <Button size="small" onClick={() => navigate(`/projects/${r.id}`)}>
          {t("common.viewAll")}
        </Button>
      ),
    },
  ];

  // Timeline component for each project
  const renderTimeline = (project: Project) => {
    const currentPhase = project.lifecycle_phase || "research";
    const currentIdx = SUPPLIER_PHASES.indexOf(currentPhase as SupplierPhase);

    return (
      <Steps
        size="small"
        current={currentIdx >= 0 ? currentIdx : 0}
        style={{ margin: "8px 0" }}
        items={SUPPLIER_PHASES.map((phase, idx) => {
          const label = getPhaseLabel(phase, lang);
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return {
            title: label,
            status: isCompleted ? "finish" : isCurrent ? "process" : "wait",
            icon: isCompleted ? (
              <CheckCircleFilled style={{ color: "#22c55e", fontSize: 14 }} />
            ) : isCurrent ? (
              <ClockCircleFilled style={{ color: "#1677ff", fontSize: 14 }} />
            ) : (
              <MinusCircleFilled style={{ color: "#d9d9d9", fontSize: 14 }} />
            ),
          };
        })}
      />
    );
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
          {t("menu.lifecycleSupplier")}
        </Typography.Title>
        <Typography.Text className="page-header-desc">
          {t("common.total", { count: projects.length })}
        </Typography.Text>
      </div>

      {/* Phase Statistics Cards */}
      <div style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          {SUPPLIER_PHASES.map((phase) => (
            <Col xs={12} sm={8} md={4} key={phase}>
              <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                <Statistic
                  title={getPhaseLabel(phase, lang)}
                  value={phaseStats[phase] || 0}
                  valueStyle={{ color: phaseColors[phase] === "default" ? "#666" : `var(--color-${phaseColors[phase]})`, fontSize: 22, fontWeight: 700 }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Project List with Timelines */}
      <Card loading={isLoading}>
        {projects.length === 0 ? (
          <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>
        ) : (
          <Table
            columns={columns}
            dataSource={projects}
            rowKey="id"
            pagination={false}
            size="small"
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: "8px 0 8px 40px" }}>
                  {renderTimeline(record)}
                </div>
              ),
              rowExpandable: () => true,
            }}
          />
        )}
      </Card>
    </div>
  );
}
