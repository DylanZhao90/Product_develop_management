import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Col, Row, Statistic, Table, Tag, Typography, Space, Select, Input, Button, Modal, Form, message } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierApi } from "../../services/api";
import { useLocale } from "../../locales";

const statusColors: Record<string, string> = { active: "green", suspended: "orange", blacklisted: "red" };
const supplierTypeColors: Record<string, string> = { design: "purple", module_dev: "cyan" };

export default function Suppliers() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", page, statusFilter, search],
    queryFn: () => supplierApi.list({ page, page_size: 20, status: statusFilter, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => supplierApi.create(values),
    onSuccess: () => { message.success(t("supplier.createdSuccess")); setModalOpen(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ["suppliers"] }); },
  });

  const suppliers = data?.data?.data || [];
  const total = data?.data?.total || 0;

  const statusFilterOptions = [
    { label: t("common.all"), value: undefined },
    { label: t("supplier.statusActive"), value: "active" },
    { label: t("supplier.statusSuspended"), value: "suspended" },
    { label: t("supplier.statusBlacklisted"), value: "blacklisted" },
  ];

  const columns = [
    { title: t("supplier.name"), dataIndex: "name", key: "name", ellipsis: true, width: 160 },
    {
      title: t("supplier.type"),
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (v: string) => <Tag color={supplierTypeColors[v] || "default"}>{v === "design" ? t("supplier.typeDesign") : v === "module_dev" ? t("supplier.typeModuleDev") : v}</Tag>,
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v: string) => <Tag color={statusColors[v]}>{v === "active" ? t("supplier.statusActive") : v === "suspended" ? t("supplier.statusSuspended") : v === "blacklisted" ? t("supplier.statusBlacklisted") : v}</Tag>,
    },
    { title: t("supplier.contactName"), dataIndex: "contact_name", key: "contact_name", width: 110, render: (v: string) => v || "-" },
    { title: t("supplier.contactEmail"), dataIndex: "contact_email", key: "contact_email", width: 180, ellipsis: true, render: (v: string) => v || "-" },
    {
      title: t("supplier.onTimeDelivery"),
      dataIndex: "on_time_delivery_rate",
      key: "on_time_delivery_rate",
      width: 110,
      render: (v: number) => (v != null ? `${v}%` : "-"),
    },
    {
      title: t("supplier.rating"),
      dataIndex: "rating",
      key: "rating",
      width: 80,
      render: (v: number) => (v != null ? `${v}/5` : "-"),
    },
    { title: t("supplier.notes"), dataIndex: "notes", key: "notes", ellipsis: true, render: (v: string) => v || "-" },
    {
      title: t("common.created"),
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
    {
      title: t("common.updated"),
      dataIndex: "updated_at",
      key: "updated_at",
      width: 170,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
  ];

  // Check if common.updated exists, fallback to label
  const updatedLabel = t("common.updated");

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
          {t("menu.suppliers")}
        </Typography.Title>
        <Typography.Text className="page-header-desc">
          {t("common.total", { count: total })}
        </Typography.Text>
      </div>

      {/* Stat Summary Cards */}
      {(() => {
        const rows = suppliers;
        const statusCounts = { active: 0, suspended: 0, blacklisted: 0 };
        const typeCounts = { design: 0, module_dev: 0 };
        let totalRating = 0;
        let ratedCount = 0;
        rows.forEach((r: any) => {
          const s = r.status as string;
          const t = r.type as string;
          const rating = r.rating as number;
          if (s in statusCounts) statusCounts[s as keyof typeof statusCounts]++;
          if (t in typeCounts) typeCounts[t as keyof typeof typeCounts]++;
          if (typeof rating === "number" && rating > 0) { totalRating += rating; ratedCount++; }
        });
        const avgRating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : "-";
        return (
          <div style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Total" value={total} valueStyle={{ color: "#4f6ef6", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Active" value={statusCounts.active} valueStyle={{ color: "#22c55e", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Suspended" value={statusCounts.suspended} valueStyle={{ color: "#fa8c16", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Blacklisted" value={statusCounts.blacklisted} valueStyle={{ color: "#ef4444", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Avg Rating" value={avgRating} suffix="/5" valueStyle={{ color: "#722ed1", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
            </Row>
            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Design" value={typeCounts.design} valueStyle={{ color: "#722ed1", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Module Dev" value={typeCounts.module_dev} valueStyle={{ color: "#13c2c2", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
            </Row>
          </div>
        );
      })()}

      <Card
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>{t("common.create")}</Button>}
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder={t("common.search")}
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder={t("common.status")}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            style={{ width: 140 }}
            options={statusFilterOptions}
          />
        </Space>
        <Table
          columns={columns}
          dataSource={suppliers}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: "max-content" }}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (total: number) => t("common.total", { count: total }) }}
          onRow={(r: { id: string }) => ({ onClick: () => navigate(`/suppliers/${r.id}`), style: { cursor: "pointer" } })}
        />
      </Card>

      <Modal
        title={t("common.create")}
        open={modalOpen}
        onOk={() => form.validateFields().then((v) => createMutation.mutate(v))}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t("supplier.name")} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label={t("supplier.type")} rules={[{ required: true }]}>
            <Select options={[{ label: t("supplier.typeDesign"), value: "design" }, { label: t("supplier.typeModuleDev"), value: "module_dev" }]} />
          </Form.Item>
          <Form.Item name="contact_name" label={t("supplier.contactName")}><Input /></Form.Item>
          <Form.Item name="contact_email" label={t("supplier.contactEmail")}><Input /></Form.Item>
          <Form.Item name="notes" label={t("supplier.notes")}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
