import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Table, Tag, Typography, Space, Select, Input, Button, Modal, Form, message } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierApi } from "../../services/api";
import { useLocale } from "../../locales";

const statusColors: Record<string, string> = { active: "green", suspended: "orange", blacklisted: "red" };

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

  const columns = [
    { title: t("supplier.name"), dataIndex: "name", key: "name", ellipsis: true },
    {
      title: t("supplier.type"),
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (v: string) => <Tag>{v === "design" ? t("supplier.typeDesign") : v === "module_dev" ? t("supplier.typeModuleDev") : v}</Tag>,
    },
    { title: t("supplier.contact"), dataIndex: "contact_name", key: "contact", width: 100, render: (v: string) => v || "-" },
    {
      title: t("supplier.rating"),
      dataIndex: "rating",
      key: "rating",
      width: 80,
      render: (v: number) => (v ? `${v}/5` : "-"),
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (v: string) => <Tag color={statusColors[v]}>{v}</Tag>,
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
          {t("common.total", { count: total })}
        </Typography.Text>
      </div>

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
            allowClear
            style={{ width: 140 }}
            options={[
              { label: t("supplier.statusActive"), value: "active" },
              { label: t("supplier.statusSuspended"), value: "suspended" },
              { label: t("supplier.statusBlacklisted"), value: "blacklisted" },
            ]}
          />
        </Space>
        <Table
          columns={columns}
          dataSource={suppliers}
          rowKey="id"
          loading={isLoading}
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
