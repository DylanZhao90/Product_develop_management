import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi, productApi } from "../../services/api";
import { useLocale } from "../../locales";

const statusColors: Record<string, string> = {
  pending_approval: "gold",
  approved: "blue",
  in_progress: "processing",
  completed: "green",
  closed: "default",
};

export default function Projects() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["projects", page, statusFilter],
    queryFn: () => projectApi.list({ page, page_size: 20, status: statusFilter }),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => productApi.list({ page_size: 100 }),
  });

  const products = productsData?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => projectApi.create(values),
    onSuccess: () => {
      message.success(t("project.createdSuccess"));
      setCreateModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const columns = [
    { title: t("project.name"), dataIndex: "name", key: "name", ellipsis: true },
    {
      title: t("project.type"),
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (v: string) => (v === "new_product" ? t("project.newProduct") : t("project.versionUpgrade")),
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (v: string) => <Tag color={statusColors[v]}>{t(`project.status.${v}`)}</Tag>,
    },
    {
      title: t("project.created"),
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
          {t("menu.projects")}
        </Typography.Title>
        <Typography.Text className="page-header-desc">
          {t("common.total", { count: data?.data?.total || 0 })}
        </Typography.Text>
      </div>

      {/* Stat Summary Cards */}
      {(() => {
        const rows = data?.data?.data || [];
        const counts = { pending_approval: 0, approved: 0, in_progress: 0, completed: 0, closed: 0 };
        const typeCounts = { new_product: 0, version_upgrade: 0 };
        rows.forEach((r: any) => {
          const s = r.status as string;
          const t = r.type as string;
          if (s in counts) counts[s as keyof typeof counts]++;
          if (t in typeCounts) typeCounts[t as keyof typeof typeCounts]++;
        });
        return (
          <div style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Total" value={data?.data?.total || 0} valueStyle={{ color: "#4f6ef6", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Pending" value={counts.pending_approval} valueStyle={{ color: "#faad14", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Approved" value={counts.approved} valueStyle={{ color: "#1677ff", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="In Progress" value={counts.in_progress} valueStyle={{ color: "#1890ff", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Completed" value={counts.completed} valueStyle={{ color: "#22c55e", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Closed" value={counts.closed} valueStyle={{ color: "#8c8c8c", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
            </Row>
            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="New Product" value={typeCounts.new_product} valueStyle={{ color: "#722ed1", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Version Upgrade" value={typeCounts.version_upgrade} valueStyle={{ color: "#13c2c2", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
            </Row>
          </div>
        );
      })()}

      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            {t("common.create")}
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder={t("common.status")}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            style={{ width: 160 }}
            options={[
              { label: t("common.all"), value: undefined },
              { label: t("project.status.pending_approval"), value: "pending_approval" },
              { label: t("project.status.approved"), value: "approved" },
              { label: t("project.status.in_progress"), value: "in_progress" },
              { label: t("project.status.completed"), value: "completed" },
              { label: t("project.status.closed"), value: "closed" },
            ]}
          />
        </Space>
        <Table
          columns={columns}
          dataSource={data?.data?.data || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.data?.total || 0,
            onChange: setPage,
            showTotal: (total: number) => t("common.total", { count: total }),
          }}
          onRow={(record: { id: string }) => ({
            onClick: () => navigate(`/projects/${record.id}`),
            style: { cursor: "pointer" },
          })}
        />
      </Card>

      <Modal
        title={`${t("common.create")} ${t("project.name")}`}
        open={createModalOpen}
        onOk={() =>
          form.validateFields().then((v) => {
            const selected = products.find((p) => p.id === v.product_id);
            createMutation.mutate({ ...v, product_code: selected?.code || null });
          })
        }
        onCancel={() => setCreateModalOpen(false)}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t("project.name")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="product_id" label={t("project.productId")} rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder={t("project.enterProductUUID")}
              optionFilterProp="label"
              options={products.map((p) => ({
                label: `${p.code} - ${p.name}`,
                value: p.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="type" label={t("project.type")} initialValue="new_product">
            <Select
              options={[
                { label: t("project.newProduct"), value: "new_product" },
                { label: t("project.versionUpgrade"), value: "version_upgrade" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
