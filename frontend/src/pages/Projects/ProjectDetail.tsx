import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  DatePicker,
} from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  SendOutlined,
  EditOutlined,
  WarningOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "../../services/api";
import type { ProjectTask } from "../../services/api-types";
import { useLocale } from "../../locales";
import dayjs from "dayjs";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";

const statusColors: Record<string, string> = {
  pending_approval: "gold",
  approved: "blue",
  in_progress: "processing",
  completed: "green",
  closed: "default",
};

const taskStatusColors: Record<string, string> = {
  pending: "default",
  in_progress: "processing",
  completed: "green",
  blocked: "red",
};

const severityColors: Record<string, string> = {
  critical: "red",
  major: "orange",
  minor: "blue",
};

const issueStatusColors: Record<string, string> = {
  open: "red",
  investigating: "processing",
  resolved: "green",
  closed: "default",
};

function buildTaskTree(tasks: ProjectTask[]) {
  const map: Record<string, ProjectTask> = {};
  const roots: ProjectTask[] = [];
  for (const t of tasks) {
    map[t.id as string] = { ...t, children: [] };
  }
  for (const t of tasks) {
    const node = map[t.id as string];
    if (t.parent_task_id && map[t.parent_task_id as string]) {
      (map[t.parent_task_id as string].children as Array<unknown>).push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [editStatusOpen, setEditStatusOpen] = useState(false);
  const [taskForm] = Form.useForm();
  const [issueForm] = Form.useForm();
  const [statusForm] = Form.useForm();

  const { data: projectResp, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectApi.get(id!),
    enabled: !!id,
  });

  const { data: tasksResp } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: () => projectApi.getTasks(id!),
    enabled: !!id,
  });

  const { data: issuesResp } = useQuery({
    queryKey: ["project-issues", id],
    queryFn: () => projectApi.getIssues(id!),
    enabled: !!id,
  });

  const createTaskMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => projectApi.createTask(id!, values),
    onSuccess: () => {
      message.success(`${t("project.addTask")} ${t("common.success")}`);
      setTaskModalOpen(false);
      taskForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
    },
  });

  const createIssueMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      projectApi.createIssue(id!, values),
    onSuccess: () => {
      message.success(`${t("project.reportIssue")} ${t("common.success")}`);
      setIssueModalOpen(false);
      issueForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["project-issues", id] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => projectApi.update(id!, values),
    onSuccess: () => {
      message.success(t("project.updatedSuccess"));
      setEditStatusOpen(false);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, values }: { taskId: string; values: Record<string, unknown> }) =>
      projectApi.updateTask(id!, taskId, values),
    onSuccess: () => {
      message.success(t("project.taskUpdated"));
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: ({ issueId, values }: { issueId: string; values: Record<string, unknown> }) =>
      projectApi.updateIssue(id!, issueId, values),
    onSuccess: () => {
      message.success(t("project.issueUpdated"));
      queryClient.invalidateQueries({ queryKey: ["project-issues", id] });
    },
  });

  const submitApprovalMutation = useMutation({
    mutationFn: () => projectApi.submitApproval(id!),
    onSuccess: () => {
      message.success(t("project.approvalSubmitted"));
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  if (isLoading) {
    return <LoadingSkeleton detail />;
  }

  const project = projectResp?.data?.data;
  const tasks = tasksResp?.data?.data || [];
  const issues = issuesResp?.data?.data || [];
  const taskTree = buildTaskTree(tasks);

  if (!project) {
    return <Typography.Text type="danger">{t("project.notFound")}</Typography.Text>;
  }

  const taskColumns = [
    {
      title: t("project.taskName"),
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: t("project.responsibleRole"),
      dataIndex: "responsible_role",
      key: "role",
      width: 100,
      render: (v: string) => v || "-",
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v: string, record: ProjectTask) => (
        <Select
          value={v}
          size="small"
          style={{ width: 100 }}
          options={["pending", "in_progress", "completed", "blocked"].map((s) => ({
            label: t(`task.status.${s}`),
            value: s,
          }))}
          onChange={(newStatus) =>
            updateTaskMutation.mutate({
              taskId: record.id as string,
              values: { status: newStatus },
            })
          }
        />
      ),
    },
    {
      title: t("project.endDate"),
      dataIndex: "planned_end",
      key: "due",
      width: 110,
      render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD") : "-"),
    },
  ];

  const issueColumns = [
    { title: t("project.issueTitle"), dataIndex: "title", key: "title", ellipsis: true },
    {
      title: t("project.issueSeverity"),
      dataIndex: "severity",
      key: "severity",
      width: 90,
      render: (v: string) => <Tag color={severityColors[v]}>{t(`issue.severity.${v}`)}</Tag>,
    },
    {
      title: t("common.status"),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v: string) => <Tag color={issueStatusColors[v]}>{t(`issue.status.${v}`)}</Tag>,
    },
    {
      title: t("common.created"),
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
  ];

  return (
    <div>
      {/* Page Header with back button and project name */}
      <div className="page-header">
        <Space align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/projects")}>
            {t("common.back")}
          </Button>
          <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
            {project.name}
          </Typography.Title>
        </Space>
      </div>

      {/* Action buttons */}
      <Space style={{ marginBottom: 16 }} wrap>
        {["pending_approval", "approved"].includes(project.status) && (
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => submitApprovalMutation.mutate()}
            loading={submitApprovalMutation.isPending}
          >
            {t("project.submitApproval")}
          </Button>
        )}
        <Button icon={<EditOutlined />} onClick={() => { statusForm.setFieldsValue(project); setEditStatusOpen(true); }}>
          {t("project.updateStatus")}
        </Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions
          items={[
            {
              key: "status",
              label: t("common.status"),
              children: <Tag color={statusColors[project.status]}>{t(`project.status.${project.status}`)}</Tag>,
            },
            {
              key: "type",
              label: t("project.type"),
              children: project.type === "new_product" ? t("project.newProduct") : t("project.versionUpgrade"),
            },
            { key: "product_id", label: t("project.productId"), children: project.product_id },
            { key: "approval_id", label: t("project.approvalId"), children: project.approval_id || "-" },
            { key: "feishu_chat_id", label: t("project.feishuChat"), children: project.feishu_chat_id || "-" },
            {
              key: "created_at",
              label: t("common.created"),
              children: project.created_at ? new Date(project.created_at).toLocaleString() : "-",
            },
          ]}
          column={2}
          bordered
          size="small"
        />
      </Card>

      <Card
        title={t("project.wbsTaskTree")}
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setTaskModalOpen(true)}>
            {t("project.addTask")}
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        {tasks.length === 0 ? (
          <div className="empty-state">
            <UnorderedListOutlined style={{ fontSize: 40, color: "var(--color-text-muted)", marginBottom: 12 }} />
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              {t("common.noData")}
            </Typography.Text>
          </div>
        ) : (
          <Table
            columns={taskColumns}
            dataSource={taskTree}
            rowKey="id"
            pagination={false}
            size="small"
            expandable={{
              defaultExpandAllRows: true,
            }}
          />
        )}
      </Card>

      <Card
        title={t("project.technicalIssues")}
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setIssueModalOpen(true)}>
            {t("project.reportIssue")}
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        {issues.length === 0 ? (
          <div className="empty-state">
            <WarningOutlined style={{ fontSize: 40, color: "var(--color-text-muted)", marginBottom: 12 }} />
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              {t("common.noData")}
            </Typography.Text>
          </div>
        ) : (
          <Table columns={issueColumns} dataSource={issues} rowKey="id" pagination={false} size="small" />
        )}
      </Card>

      {/* Add Task Modal */}
      <Modal
        title={t("project.addTask")}
        open={taskModalOpen}
        onOk={() => taskForm.validateFields().then((v) => createTaskMutation.mutate(v))}
        onCancel={() => { setTaskModalOpen(false); taskForm.resetFields(); }}
        confirmLoading={createTaskMutation.isPending}
      >
        <Form form={taskForm} layout="vertical">
          <Form.Item name="name" label={t("project.taskName")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parent_task_id" label={t("project.parentTask")}>
            <Select
              allowClear
              placeholder={t("project.parentTaskPlaceholder")}
              options={tasks.map((t) => ({
                label: t.name as string,
                value: t.id as string,
              }))}
            />
          </Form.Item>
          <Form.Item name="responsible_role" label={t("project.responsibleRole")}>
            <Select
              allowClear
              options={[
                { label: "PM", value: "pm" },
                { label: "Designer", value: "designer" },
                { label: "Engineer", value: "engineer" },
                { label: "Cert Specialist", value: "cert_specialist" },
                { label: "Ops", value: "ops" },
                { label: "Supplier", value: "supplier" },
              ]}
            />
          </Form.Item>
          <Space>
            <Form.Item name="planned_start" label={t("project.startDate")}>
              <DatePicker />
            </Form.Item>
            <Form.Item name="planned_end" label={t("project.endDate")}>
              <DatePicker />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Add Issue Modal */}
      <Modal
        title={t("project.reportIssue")}
        open={issueModalOpen}
        onOk={() => issueForm.validateFields().then((v) => createIssueMutation.mutate(v))}
        onCancel={() => { setIssueModalOpen(false); issueForm.resetFields(); }}
        confirmLoading={createIssueMutation.isPending}
      >
        <Form form={issueForm} layout="vertical">
          <Form.Item name="title" label={t("project.issueTitle")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="severity" label={t("project.issueSeverity")} initialValue="minor">
            <Select
              options={[
                { label: t("issue.severity.critical"), value: "critical" },
                { label: t("issue.severity.major"), value: "major" },
                { label: t("issue.severity.minor"), value: "minor" },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label={t("project.issueDescription")}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Status Modal */}
      <Modal
        title={t("project.updateStatus")}
        open={editStatusOpen}
        onOk={() => statusForm.validateFields().then((v) => updateStatusMutation.mutate(v))}
        onCancel={() => setEditStatusOpen(false)}
        confirmLoading={updateStatusMutation.isPending}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item name="status" label={t("common.status")} rules={[{ required: true }]}>
            <Select
              options={[
                { label: t("project.status.pending_approval"), value: "pending_approval" },
                { label: t("project.status.approved"), value: "approved" },
                { label: t("project.status.in_progress"), value: "in_progress" },
                { label: t("project.status.completed"), value: "completed" },
                { label: t("project.status.closed"), value: "closed" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
