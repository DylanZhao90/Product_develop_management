import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Form, Input, Modal, Select, Space, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "../../services/api";
import { useLocale } from "../../locales";
import { Table } from "antd";

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

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => projectApi.create(values),
    onSuccess: () => {
      message.success("Project created");
      setCreateModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const columns = [
    { title: "Project Name", dataIndex: "name", key: "name", ellipsis: true },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (v: string) => (v === "new_product" ? "New Product" : "Version Upgrade"),
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (v: string) => <Tag color={statusColors[v]}>{t(`project.status.${v}`)}</Tag>,
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
  ];

  return (
    <div>
      <Card
        title={<Typography.Title level={4}>{t("menu.projects")}</Typography.Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            {t("common.create")}
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            allowClear
            style={{ width: 160 }}
            options={[
              { label: "Pending Approval", value: "pending_approval" },
              { label: "Approved", value: "approved" },
              { label: "In Progress", value: "in_progress" },
              { label: "Completed", value: "completed" },
              { label: "Closed", value: "closed" },
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
            showTotal: (total: number) => `Total ${total}`,
          }}
          onRow={(record: { id: string }) => ({
            onClick: () => navigate(`/projects/${record.id}`),
            style: { cursor: "pointer" },
          })}
        />
      </Card>

      <Modal
        title={`${t("common.create")} Project`}
        open={createModalOpen}
        onOk={() => form.validateFields().then((v) => createMutation.mutate(v))}
        onCancel={() => setCreateModalOpen(false)}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Project Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="product_id" label="Product ID" rules={[{ required: true }]}>
            <Input placeholder="Enter product UUID" />
          </Form.Item>
          <Form.Item name="type" label="Project Type" initialValue="new_product">
            <Select
              options={[
                { label: "New Product", value: "new_product" },
                { label: "Version Upgrade", value: "version_upgrade" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
