import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button, Card, Descriptions, Form, Input, Modal, Select, Space, Table, Tag, Typography, message,
} from "antd";
import { ArrowLeftOutlined, PlusOutlined, CheckOutlined, CloseOutlined, InboxOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierApi } from "../../services/api";
import { useLocale } from "../../locales";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";

const statusColors: Record<string, string> = { active: "green", suspended: "orange", blacklisted: "red" };
const reviewColors: Record<string, string> = { pending_review: "orange", approved: "green", rejected: "red" };

export default function SupplierDetail() {
  const { t } = useLocale();
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
    onSuccess: () => { message.success(t("supplier.taskCreated")); setTaskModalOpen(false); taskForm.resetFields(); queryClient.invalidateQueries({ queryKey: ["supplier-tasks", id] }); },
  });

  const reviewTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Record<string, unknown> }) =>
      supplierApi.reviewOutsourceTask(id!, taskId, data),
    onSuccess: () => { message.success(t("supplier.reviewSubmitted")); queryClient.invalidateQueries({ queryKey: ["supplier-tasks", id] }); },
  });

  if (isLoading) return <LoadingSkeleton detail />;

  const supplier = sResp?.data?.data;
  const tasks = tasksResp?.data?.data || [];

  if (!supplier) return <Typography.Text type="danger">{t("supplier.notFound")}</Typography.Text>;

  const taskColumns = [
    { title: t("supplier.taskTitle"), dataIndex: "title", key: "title", ellipsis: true },
    {
      title: t("supplier.quotation"),
      dataIndex: "quotation_amount",
      key: "quotation_amount",
      width: 120,
      render: (v: number) => (v ? `¥${v.toLocaleString()}` : "-"),
    },
    {
      title: t("supplier.review"),
      dataIndex: "review_status",
      key: "review_status",
      width: 120,
      render: (v: string) => <Tag color={reviewColors[v]}>{v}</Tag>,
    },
    { title: t("supplier.comment"), dataIndex: "review_comment", key: "review_comment", width: 150, ellipsis: true, render: (v: string) => v || "-" },
    {
      title: t("common.created"),
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
    {
      title: t("common.actions"),
      key: "action",
      width: 160,
      render: (_: unknown, r: Record<string, unknown>) =>
        r.review_status === "pending_review" ? (
          <Space>
            <Button size="small" type="primary" icon={<CheckOutlined />}
              onClick={() => reviewTaskMutation.mutate({ taskId: r.id as string, data: { review_status: "approved" } })}>
              {t("common.approve")}
            </Button>
            <Button size="small" danger icon={<CloseOutlined />}
              onClick={() => reviewTaskMutation.mutate({ taskId: r.id as string, data: { review_status: "rejected" } })}>
              {t("common.reject")}
            </Button>
          </Space>
        ) : null,
    },
  ];

  return (
    <div>
      {/* Page Header with back button and supplier name */}
      <div className="page-header">
        <Space align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/suppliers")}>{t("common.back")}</Button>
          <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
            {supplier.name}
          </Typography.Title>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions items={[
          { label: t("supplier.type"), children: <Tag>{supplier.type === "design" ? t("supplier.typeDesign") : supplier.type === "module_dev" ? t("supplier.typeModuleDev") : supplier.type}</Tag> },
          { label: t("supplier.contact"), children: supplier.contact_name || "-" },
          { label: t("supplier.email"), children: supplier.contact_email || "-" },
          { label: t("supplier.rating"), children: supplier.rating ? `${supplier.rating}/5` : "-" },
          { label: t("supplier.onTimeDelivery"), children: supplier.on_time_delivery_rate ? `${supplier.on_time_delivery_rate}%` : "-" },
          { label: t("common.status"), children: <Tag color={statusColors[supplier.status]}>{supplier.status}</Tag> },
          { label: t("supplier.notes"), children: supplier.notes || "-", span: 2 },
        ]} column={2} bordered size="small" />
      </Card>

      <Card
        title={t("supplier.outsourceTasks")}
        extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setTaskModalOpen(true)}>{t("supplier.addTask")}</Button>}
      >
        {tasks.length === 0 ? (
          <div className="empty-state">
            <InboxOutlined style={{ fontSize: 40, color: "var(--color-text-muted)", marginBottom: 12 }} />
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              {t("common.noData")}
            </Typography.Text>
          </div>
        ) : (
          <Table columns={taskColumns} dataSource={tasks} rowKey="id" pagination={false} size="small" />
        )}
      </Card>

      <Modal title={t("supplier.newTask")} open={taskModalOpen}
        onOk={() => taskForm.validateFields().then((v) => createTaskMutation.mutate(v))}
        onCancel={() => { setTaskModalOpen(false); taskForm.resetFields(); }}
        confirmLoading={createTaskMutation.isPending}>
        <Form form={taskForm} layout="vertical">
          <Form.Item name="title" label={t("supplier.taskTitle")} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="project_task_id" label={t("supplier.projectTaskId")}><Input placeholder={t("supplier.linkToWbs")} /></Form.Item>
          <Form.Item name="quotation_amount" label={t("supplier.quotationLabel")}><Input type="number" /></Form.Item>
          <Form.Item name="rfq_url" label={t("supplier.rfqUrl")}><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
