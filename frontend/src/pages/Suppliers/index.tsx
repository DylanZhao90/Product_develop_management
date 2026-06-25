import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Col, Row, Statistic, Table, Tag, Typography, Space, Input, Button, Modal, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierProfileApi } from "../../services/api";
import type { SupplierProfile } from "../../services/api-types";
import { useLocale } from "../../locales";

const statusColors: Record<string, string> = { active: "green", suspended: "orange", blacklisted: "red" };

const typeColors: Record<string, string> = {
  pcba_manufacturer: "purple",
  cable_assembler: "cyan",
  power_module: "geekblue",
  component_distributor: "gold",
  ems_provider: "volcano",
};

const phaseColors: Record<string, string> = {
  supplier_research: "default",
  supplier_evaluation: "blue",
  supplier_onboarding: "cyan",
  supplier_cooperation: "green",
};

function getHealthColor(score: number | null): string {
  if (score == null) return "default";
  if (score >= 80) return "green";
  if (score >= 60) return "orange";
  return "red";
}

export default function Suppliers() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["supplierProfiles"],
    queryFn: () => supplierProfileApi.list({ page_size: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supplierProfileApi.delete(id),
    onSuccess: () => {
      message.success(t("common.deleted"));
      queryClient.invalidateQueries({ queryKey: ["supplierProfiles"] });
    },
  });

  const profiles: SupplierProfile[] = data?.data?.data || [];
  const totalCount = profiles.length;

  // Compute stats
  const activeCount = profiles.filter((p) => p.status === "active").length;
  const healthScores = profiles.map((p) => p.health_score).filter((s): s is number => s != null);
  const avgHealthScore = healthScores.length > 0
    ? (healthScores.reduce((a, b) => a + b, 0) / healthScores.length).toFixed(1)
    : "-";
  const highRiskCount = profiles.filter((p) => p.health_score != null && p.health_score < 60).length;

  // Client-side search filter
  const filtered = search
    ? profiles.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : profiles;

  const columns = [
    {
      title: t("supplier.name"),
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      width: 180,
      render: (v: string, r: SupplierProfile) => (
        <a onClick={() => navigate(`/suppliers/${r.id}`)}>{v}</a>
      ),
    },
    {
      title: t("supplier.type"),
      dataIndex: "type",
      key: "type",
      width: 160,
      render: (v: string) => {
        const key = `supplier.type.${v}`;
        const label = t(key) !== key ? t(key) : v;
        return <Tag color={typeColors[v] || "default"}>{label}</Tag>;
      },
    },
    {
      title: t("supplier.currentPhase"),
      dataIndex: "current_phase",
      key: "current_phase",
      width: 150,
      render: (v: string | null) => {
        if (!v) return "-";
        const key = `supplier.phase.${v}`;
        const label = t(key) !== key ? t(key) : v;
        return <Tag color={phaseColors[v] || "default"}>{label}</Tag>;
      },
    },
    {
      title: t("supplier.rating"),
      dataIndex: "rating",
      key: "rating",
      width: 80,
      render: (v: number | null) => (v != null ? `${v}/5` : "-"),
    },
    {
      title: t("supplier.onTimeDelivery"),
      dataIndex: "on_time_delivery_rate",
      key: "on_time_delivery_rate",
      width: 110,
      render: (v: number | null) => (v != null ? `${v}%` : "-"),
    },
    {
      title: t("supplier.healthScore"),
      dataIndex: "health_score",
      key: "health_score",
      width: 110,
      render: (v: number | null) => (
        <Tag color={getHealthColor(v)}>{v != null ? `${v}` : "-"}</Tag>
      ),
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v: string) => (
        <Tag color={statusColors[v]}>
          {t(`supplier.status${v.charAt(0).toUpperCase() + v.slice(1)}`)}
        </Tag>
      ),
    },
    {
      title: t("common.actions"),
      key: "action",
      width: 80,
      render: (_: unknown, r: SupplierProfile) => (
        <Button
          size="small"
          danger
          onClick={(e) => {
            e.stopPropagation();
            Modal.confirm({
              title: t("common.deleteConfirm"),
              content: t("common.deleteWarning"),
              okText: t("common.delete"),
              cancelText: t("common.cancel"),
              okButtonProps: { danger: true },
              onOk: () => deleteMutation.mutate(r.id),
            });
          }}
        >
          {t("common.delete")}
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
          {t("menu.suppliers")}
        </Typography.Title>
        <Typography.Text className="page-header-desc">
          {t("common.total", { count: totalCount })}
        </Typography.Text>
      </div>

      {/* Stat Summary Cards */}
      <div style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={6} lg={4}>
            <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
              <Statistic
                title={t("supplier.stat.total")}
                value={totalCount}
                valueStyle={{ color: "#4f6ef6", fontSize: 22, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
              <Statistic
                title={t("supplier.stat.active")}
                value={activeCount}
                valueStyle={{ color: "#22c55e", fontSize: 22, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
              <Statistic
                title={t("supplier.stat.avgHealthScore")}
                value={avgHealthScore}
                suffix="/100"
                valueStyle={{ color: "#722ed1", fontSize: 22, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
              <Statistic
                title={t("supplier.stat.highRisk")}
                value={highRiskCount}
                valueStyle={{ color: "#ef4444", fontSize: 22, fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder={t("common.search")}
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
        </Space>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: "max-content" }}
          pagination={{
            pageSize: 20,
            total: filtered.length,
            showTotal: (total: number) => t("common.total", { count: total }),
          }}
        />
      </Card>
    </div>
  );
}
