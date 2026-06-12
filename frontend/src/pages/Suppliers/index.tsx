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
    onSuccess: () => { message.success("Supplier created"); setModalOpen(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ["suppliers"] }); },
  });

  const suppliers = data?.data?.data || [];
  const total = data?.data?.total || 0;

  const columns = [
    { title: "Name", dataIndex: "name", key: "name", ellipsis: true },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (v: string) => <Tag>{v === "design" ? "Design" : v === "module_dev" ? "Module Dev" : v}</Tag>,
    },
    { title: "Contact", dataIndex: "contact_name", key: "contact", width: 100, render: (v: string) => v || "-" },
    {
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
      width: 80,
      render: (v: number) => (v ? `${v}/5` : "-"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (v: string) => <Tag color={statusColors[v]}>{v}</Tag>,
    },
  ];

  return (
    <div>
      <Card
        title={<Typography.Title level={4}>{t("menu.suppliers")}</Typography.Title>}
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
            placeholder="Status"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            allowClear
            style={{ width: 140 }}
            options={[
              { label: "Active", value: "active" },
              { label: "Suspended", value: "suspended" },
              { label: "Blacklisted", value: "blacklisted" },
            ]}
          />
        </Space>
        <Table
          columns={columns}
          dataSource={suppliers}
          rowKey="id"
          loading={isLoading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (t: number) => `Total ${t}` }}
          onRow={(r: { id: string }) => ({ onClick: () => navigate(`/suppliers/${r.id}`), style: { cursor: "pointer" } })}
        />
      </Card>

      <Modal
        title="Add Supplier"
        open={modalOpen}
        onOk={() => form.validateFields().then((v) => createMutation.mutate(v))}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={[{ label: "Design", value: "design" }, { label: "Module Dev", value: "module_dev" }]} />
          </Form.Item>
          <Form.Item name="contact_name" label="Contact Name"><Input /></Form.Item>
          <Form.Item name="contact_email" label="Contact Email"><Input /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
