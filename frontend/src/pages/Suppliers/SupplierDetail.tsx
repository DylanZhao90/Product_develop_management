import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button, Card, Descriptions, Form, Input, Modal, Select, Space, Spin, Table, Tag, Typography, message,
} from "antd";
import { ArrowLeftOutlined, PlusOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierApi } from "../../services/api";

const statusColors: Record<string, string> = { active: "green", suspended: "orange", blacklisted: "red" };
const reviewColors: Record<string, string> = { pending_review: "orange", approved: "green", rejected: "red" };

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm] = Form.useForm();

  const { data: sResp, isLoading } = useQuery({
    queryKey: ["supplier", id],
    queryFn: () => supplierApi.get(id!),
    enabled: !!id,
  });

  const { data: tasksResp } = useQuery({
    queryKey: ["supplier-tasks", id],
    queryFn: () => supplierApi.getOutsourceTasks(id!),
    enabled: !!id,
  });

  const createTaskMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) => supplierApi.createOutsourceTask(id!, v),
    onSuccess: () => { message.success("Task created"); setTaskModalOpen(false); taskForm.resetFields(); queryClient.invalidateQueries({ queryKey: ["supplier-tasks", id] }); },
  });

  const reviewTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Record<string, unknown> }) =>
      supplierApi.reviewOutsourceTask(id!, taskId, data),
    onSuccess: () => { message.success("Review submitted"); queryClient.invalidateQueries({ queryKey: ["supplier-tasks", id] }); },
  });

  if (isLoading) return <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>;

  const supplier = sResp?.data?.data;
  const tasks = tasksResp?.data?.data || [];

  if (!supplier) return <Typography.Text type="danger">Supplier not found</Typography.Text>;

  const taskColumns = [
    { title: "Title", dataIndex: "title", key: "title", ellipsis: true },
    {
      title: "Quotation",
      dataIndex: "quotation_amount",
      key: "quotation_amount",
      width: 120,
      render: (v: number) => (v ? `¥${v.toLocaleString()}` : "-"),
    },
    {
      title: "Review",
      dataIndex: "review_status",
      key: "review_status",
      width: 120,
      render: (v: string) => <Tag color={reviewColors[v]}>{v}</Tag>,
    },
    { title: "Comment", dataIndex: "review_comment", key: "review_comment", width: 150, ellipsis: true, render: (v: string) => v || "-" },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
    {
      title: "Action",
      key: "action",
      width: 160,
      render: (_: unknown, r: Record<string, unknown>) =>
        r.review_status === "pending_review" ? (
          <Space>
            <Button size="small" type="primary" icon={<CheckOutlined />}
              onClick={() => reviewTaskMutation.mutate({ taskId: r.id as string, data: { review_status: "approved" } })}>
              Approve
            </Button>
            <Button size="small" danger icon={<CloseOutlined />}
              onClick={() => reviewTaskMutation.mutate({ taskId: r.id as string, data: { review_status: "rejected" } })}>
              Reject
            </Button>
          </Space>
        ) : null,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/suppliers")}>Back</Button>
      </Space>

      <Card title={supplier.name} style={{ marginBottom: 16 }}>
        <Descriptions items={[
          { label: "Type", children: <Tag>{supplier.type === "design" ? "Design" : supplier.type === "module_dev" ? "Module Dev" : supplier.type}</Tag> },
          { label: "Contact", children: supplier.contact_name || "-" },
          { label: "Email", children: supplier.contact_email || "-" },
          { label: "Rating", children: supplier.rating ? `${supplier.rating}/5` : "-" },
          { label: "On-Time Delivery", children: supplier.on_time_delivery_rate ? `${supplier.on_time_delivery_rate}%` : "-" },
          { label: "Status", children: <Tag color={statusColors[supplier.status]}>{supplier.status}</Tag> },
          { label: "Notes", children: supplier.notes || "-", span: 2 },
        ]} column={2} bordered size="small" />
      </Card>

      <Card
        title="Outsource Tasks"
        extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setTaskModalOpen(true)}>Add Task</Button>}
      >
        <Table columns={taskColumns} dataSource={tasks} rowKey="id" pagination={false} size="small" />
      </Card>

      <Modal title="New Outsource Task" open={taskModalOpen}
        onOk={() => taskForm.validateFields().then((v) => createTaskMutation.mutate(v))}
        onCancel={() => { setTaskModalOpen(false); taskForm.resetFields(); }}
        confirmLoading={createTaskMutation.isPending}>
        <Form form={taskForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="project_task_id" label="Project Task ID"><Input placeholder="Link to WBS task" /></Form.Item>
          <Form.Item name="quotation_amount" label="Quotation (¥)"><Input type="number" /></Form.Item>
          <Form.Item name="rfq_url" label="RFQ URL"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
