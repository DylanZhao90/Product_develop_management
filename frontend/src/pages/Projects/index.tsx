import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tag, Tabs, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi, productApi, projectTypeConfigApi } from "../../services/api";
import { useLocale } from "../../locales";
import type { ProductCreate } from "../../services/api-types";

const statusColors: Record<string, string> = {
  pending_approval: "gold",
  approved: "blue",
  in_progress: "processing",
  completed: "green",
  closed: "default",
};

const PRODUCT_TYPE_OPTIONS = [
  { labelKey: "product.type.ac_charger", value: "ac_charger" },
  { labelKey: "product.type.dc_charger", value: "dc_charger" },
  { labelKey: "product.type.portable", value: "portable" },
];

const MARKET_OPTIONS = ["US", "EU", "CN", "JP", "KR", "AU", "CA", "UK", "NZ"];
const CERT_OPTIONS = ["CE", "UL", "FCC", "CCC", "ROHS", "PSE", "UKCA", "TUV", "RCM", "KC"];

export default function Projects() {
  const navigate = useNavigate();
  const { t, lang } = useLocale();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [productSubModalOpen, setProductSubModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [productForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["projects", page, statusFilter],
    queryFn: () => projectApi.list({ page, page_size: 20, status: statusFilter }),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => productApi.list({ page_size: 100 }),
  });

  const products = productsData?.data?.data || [];

  // ---- C-5: Dynamic project type configs ----
  const { data: typeConfigsData } = useQuery({
    queryKey: ["project-type-configs"],
    queryFn: () => projectTypeConfigApi.list(),
  });

  const typeConfigs = typeConfigsData?.data?.data || [];
  const projectTypeConfigMap = new Map(typeConfigs.map((c) => [c.type_key, c]));

  // ---- C-7: Tab-filtered projects ----
  const allProjects = data?.data?.data || [];
  const filteredProjects = allProjects.filter((p: any) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending_approval') return p.approval_status === 'pending';
    if (activeTab === 'approved') return p.approval_status === 'approved';
    return p.status === activeTab;
  });

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => projectApi.create(values),
    onSuccess: () => {
      message.success(t("project.createdSuccess"));
      setCreateModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectApi.delete(id),
    onSuccess: () => {
      message.success(t("common.deleted"));
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  // ---- C-6: Product sub-create mutation ----
  const createProductMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => productApi.create(values as unknown as ProductCreate),
    onSuccess: (res) => {
      message.success(t("product.createdSuccess"));
      setProductSubModalOpen(false);
      productForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      // Auto-select the newly created product
      const newProductId = (res as any)?.data?.data?.id;
      if (newProductId) {
        form.setFieldValue("product_id", newProductId);
      }
    },
  });

  // ---- Columns ----
  const columns = [
    { title: t("project.name"), dataIndex: "name", key: "name", ellipsis: true },
    {
      title: t("project.type"),
      dataIndex: "project_type_key",
      key: "type",
      width: 140,
      render: (v: string) => {
        const config = projectTypeConfigMap.get(v);
        return config?.display_name?.[lang] || v;
      },
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (v: string) => <Tag color={statusColors[v]}>{t(`project.status.${v}`)}</Tag>,
    },
    {
      title: t("project.owner"),
      dataIndex: "owner",
      key: "owner",
      width: 110,
      render: (v: string) => v || "-",
    },
    {
      title: t("project.targetDate"),
      dataIndex: "target_date",
      key: "target_date",
      width: 120,
      render: (v: string) => (v ? new Date(v).toLocaleDateString() : "-"),
    },
    {
      title: t("project.productId"),
      dataIndex: "product_code",
      key: "product_code",
      width: 120,
      render: (v: string) => v || "-",
    },
    {
      title: t("project.created"),
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
    {
      title: t("common.actions"),
      key: "action",
      width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
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
              onOk: () => deleteMutation.mutate(r.id as string),
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
        const typeCounts: Record<string, number> = {};
        rows.forEach((r: any) => {
          const s = r.status as string;
          const t = r.project_type_key as string;
          if (s in counts) counts[s as keyof typeof counts]++;
          if (t) typeCounts[t] = (typeCounts[t] || 0) + 1;
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
              {Object.entries(typeCounts).map(([key, val]) => {
                const config = projectTypeConfigMap.get(key);
                const label = config?.display_name?.[lang] || key;
                return (
                  <Col xs={12} sm={6} lg={3} key={key}>
                    <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                      <Statistic title={label} value={val} valueStyle={{ color: "#722ed1", fontSize: 22, fontWeight: 700 }} />
                    </Card>
                  </Col>
                );
              })}
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
        {(() => {
          const rows = allProjects;
          const tabCounts = {
            all: rows.length,
            pending_approval: rows.filter((r: any) => r.approval_status === 'pending').length,
            approved: rows.filter((r: any) => r.approval_status === 'approved').length,
            in_progress: rows.filter((r: any) => r.status === 'in_progress').length,
            completed: rows.filter((r: any) => r.status === 'completed').length,
            closed: rows.filter((r: any) => r.status === 'closed').length,
          };
          const tabItems = [
            { key: 'all', labelKey: 'common.all' },
            { key: 'pending_approval', labelKey: 'project.status.pending_approval' },
            { key: 'approved', labelKey: 'project.status.approved' },
            { key: 'in_progress', labelKey: 'project.status.in_progress' },
            { key: 'completed', labelKey: 'project.status.completed' },
            { key: 'closed', labelKey: 'project.status.closed' },
          ];
          return (
            <Tabs
              activeKey={activeTab}
              onChange={(key) => { setActiveTab(key); setPage(1); }}
              items={tabItems.map(item => ({
                key: item.key,
                label: (
                  <span>
                    {t(item.labelKey)}{' '}
                    <Badge
                      count={tabCounts[item.key as keyof typeof tabCounts]}
                      style={item.key === 'all' ? { backgroundColor: '#4f6ef6' } : undefined}
                      size="small"
                    />
                  </span>
                ),
              }))}
              style={{ marginBottom: 8 }}
            />
          );
        })()}
        <Table
          columns={columns}
          dataSource={filteredProjects}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: 20,
            total: filteredProjects.length,
            onChange: setPage,
            showTotal: (total: number) => t("common.total", { count: total }),
          }}
          onRow={(record: { id: string }) => ({
            onClick: () => navigate(`/projects/${record.id}`),
            style: { cursor: "pointer" },
          })}
        />
      </Card>

      {/* ---- C-5 + C-6: Create Project Modal ---- */}
      <Modal
        title={`${t("common.create")} ${t("project.name")}`}
        open={createModalOpen}
        onOk={() =>
          form.validateFields().then((v) => {
            const selected = products.find((p) => p.id === v.product_id);
            createMutation.mutate({ ...v, project_type_key: v.project_type_key, product_code: selected?.code || null });
          })
        }
        onCancel={() => setCreateModalOpen(false)}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t("project.name")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          {/* Project type — dynamic from projectTypeConfigApi */}
          <Form.Item name="project_type_key" label={t("project.type")} initialValue="new_product" rules={[{ required: true }]}>
            <Select
              options={typeConfigs
                .filter((c) => c.is_active)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((c) => ({
                  label: c.display_name?.[lang] || c.type_key,
                  value: c.type_key,
                }))}
            />
          </Form.Item>

          {/* Product selection — with "new product" action */}
          <Form.Item label={t("project.productId")} required>
            <Space.Compact style={{ width: "100%" }}>
              <Form.Item name="product_id" noStyle rules={[{ required: true, message: t("project.enterProductUUID") }]}>
                <Select
                  showSearch
                  placeholder={t("project.enterProductUUID")}
                  optionFilterProp="label"
                  style={{ width: "calc(100% - 120px)" }}
                  options={products.map((p) => ({
                    label: `${p.code} - ${p.name}`,
                    value: p.id,
                  }))}
                />
              </Form.Item>
              <Button onClick={() => setProductSubModalOpen(true)}>
                {t("project.createNewProduct")}
              </Button>
            </Space.Compact>
          </Form.Item>
        </Form>
      </Modal>

      {/* ---- C-6: New Product sub-Modal ---- */}
      <Modal
        title={t("product.createTitle")}
        open={productSubModalOpen}
        onOk={() =>
          productForm.validateFields().then((v) => {
            createProductMutation.mutate({ ...v, project_id: "__pending__" } as any);
          })
        }
        onCancel={() => {
          setProductSubModalOpen(false);
          productForm.resetFields();
        }}
        confirmLoading={createProductMutation.isPending}
      >
        <Form form={productForm} layout="vertical">
          <Form.Item name="name" label={t("product.name")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="model" label={t("product.model")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label={t("product.type")} initialValue="ac_charger" rules={[{ required: true }]}>
            <Select
              options={PRODUCT_TYPE_OPTIONS.map((opt) => ({
                label: t(opt.labelKey),
                value: opt.value,
              }))}
            />
          </Form.Item>
          <Form.Item name="power" label={t("product.power")}>
            <Input placeholder="e.g. 220V 7.7kW" />
          </Form.Item>
          <Form.Item name="target_markets" label={t("product.targetMarkets")}>
            <Select
              mode="multiple"
              placeholder={t("product.targetMarkets")}
              options={MARKET_OPTIONS.map((m) => ({ label: m, value: m }))}
            />
          </Form.Item>
          <Form.Item name="certification_requirements" label={t("product.certificationRequirements")}>
            <Select
              mode="multiple"
              placeholder={t("product.certificationRequirements")}
              options={CERT_OPTIONS.map((c) => ({ label: c, value: c }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
