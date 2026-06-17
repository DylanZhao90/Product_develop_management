import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  ProTable,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from "@/components/common/antd-imports";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "../../services/api";
import { useLocale } from "../../locales";
import type { ProductCreate } from "../../services/api-types";

const statusColors: Record<string, string> = {
  in_development: "blue",
  trial_handover: "orange",
  on_sale: "green",
  discontinued: "red",
  eol: "default",
};

const typeColors: Record<string, string> = {
  ac_charger: "purple",
  dc_charger: "cyan",
  portable: "lime",
};

export default function Products() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, search, statusFilter, typeFilter],
    queryFn: () =>
      productApi.list({
        page,
        page_size: 20,
        search: search || undefined,
        status: statusFilter,
        type: typeFilter,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => productApi.create(values as any),
    onSuccess: () => {
      message.success(t("product.createdSuccess"));
      setCreateModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleCreate = () => {
    form.validateFields().then((values) => createMutation.mutate(values));
  };

  const columns = [
    {
      title: t("product.code"),
      dataIndex: "code",
      key: "code",
      width: 160,
    },
    {
      title: t("product.model"),
      dataIndex: "model",
      key: "model",
      width: 160,
    },
    {
      title: t("product.name"),
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: t("product.type"),
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (v: string) => (
        <Tag color={typeColors[v] || "default"}>{v === "ac_charger" ? "AC" : v === "dc_charger" ? "DC" : v === "portable" ? "Portable" : v || "-"}</Tag>
      ),
    },
    {
      title: t("common.status"),
      dataIndex: "lifecycle_status",
      key: "lifecycle_status",
      width: 130,
      render: (v: string) => (
        <Tag color={statusColors[v] || "default"}>{t(`product.status.${v}`) || v}</Tag>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
          {t("menu.products")}
        </Typography.Title>
        <Typography.Text className="page-header-desc">
          {t("common.total", { count: data?.data?.total || 0 })}
        </Typography.Text>
      </div>

      {/* Stat Summary Cards */}
      {(() => {
        const rows = data?.data?.data || [];
        const counts = { in_development: 0, trial_handover: 0, on_sale: 0, discontinued: 0, eol: 0 };
        const typeCounts = { ac_charger: 0, dc_charger: 0, portable: 0 };
        rows.forEach((r: any) => {
          const s = r.lifecycle_status as string;
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
                  <Statistic title="In Development" value={counts.in_development} valueStyle={{ color: "#1677ff", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Trial Handover" value={counts.trial_handover} valueStyle={{ color: "#fa8c16", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="On Sale" value={counts.on_sale} valueStyle={{ color: "#22c55e", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Discontinued" value={counts.discontinued} valueStyle={{ color: "#ef4444", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="EOL" value={counts.eol} valueStyle={{ color: "#8c8c8c", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
            </Row>
            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic
                    title={<span>AC <small style={{ color: "#888", fontWeight: 400 }}>Charger</small></span>}
                    value={typeCounts.ac_charger}
                    valueStyle={{ color: "#722ed1", fontSize: 22, fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic
                    title={<span>DC <small style={{ color: "#888", fontWeight: 400 }}>Charger</small></span>}
                    value={typeCounts.dc_charger}
                    valueStyle={{ color: "#13c2c2", fontSize: 22, fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Portable" value={typeCounts.portable} valueStyle={{ color: "#a0d911", fontSize: 22, fontWeight: 700 }} />
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
            options={[
              { label: t("common.all"), value: undefined },
              { label: t("product.status.in_development"), value: "in_development" },
              { label: t("product.status.trial_handover"), value: "trial_handover" },
              { label: t("product.status.on_sale"), value: "on_sale" },
              { label: t("product.status.discontinued"), value: "discontinued" },
              { label: t("product.status.eol"), value: "eol" },
            ]}
          />
          <Select
            placeholder={t("product.type")}
            value={typeFilter}
            onChange={(v) => { setTypeFilter(v); setPage(1); }}
            style={{ width: 140 }}
            options={[
              { label: t("common.all"), value: undefined },
              { label: "AC Charger", value: "ac_charger" },
              { label: "DC Charger", value: "dc_charger" },
              { label: "Portable", value: "portable" },
            ]}
          />
        </Space>
        <ProTable
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
            onClick: () => navigate(`/products/${record.id}`),
            style: { cursor: "pointer" },
          })}
        />
      </Card>

      <Modal
        title={`${t("common.create")} ${t("menu.products")}`}
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => setCreateModalOpen(false)}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="model" label={t("product.model")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label={t("product.name")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label={t("product.type")}>
            <Select
              options={[
                { label: "AC Charger", value: "ac_charger" },
                { label: "DC Charger", value: "dc_charger" },
                { label: "Portable", value: "portable" },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label={t("common.desc") || "Description"}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
