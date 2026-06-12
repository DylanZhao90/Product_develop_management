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
  Spin,
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
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "../../services/api";
import { useLocale } from "../../locales";
import dayjs from "dayjs";

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

function buildTaskTree(tasks: Record<string, unknown>[]) {
  const map: Record<string, Record<string, unknown>> = {};
  const roots: Record<string, unknown>[] = [];
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
      message.success("Task created");
      setTaskModalOpen(false);
      taskForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
    },
  });

  const createIssueMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      projectApi.createIssue(id!, values),
    onSuccess: () => {
      message.success("Issue created");
      setIssueModalOpen(false);
      issueForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["project-issues", id] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => projectApi.update(id!, values),
    onSuccess: () => {
      message.success("Status updated");
      setEditStatusOpen(false);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, values }: { taskId: string; values: Record<string, unknown> }) =>
      projectApi.updateTask(id!, taskId, values),
    onSuccess: () => {
      message.success("Task updated");
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: ({ issueId, values }: { issueId: string; values: Record<string, unknown> }) =>
      projectApi.updateIssue(id!, issueId, values),
    onSuccess: () => {
      message.success("Issue updated");
      queryClient.invalidateQueries({ queryKey: ["project-issues", id] });
    },
  });

  const submitApprovalMutation = useMutation({
    mutationFn: () => projectApi.submitApproval(id!),
    onSuccess: () => {
      message.success("Approval submitted");
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>;
  }

  const project = projectResp?.data?.data;
  const tasks = tasksResp?.data?.data || [];
  const issues = issuesResp?.data?.data || [];
  const taskTree = buildTaskTree(tasks);

  if (!project) {
    return <Typography.Text type="danger">Project not found</Typography.Text>;
  }

  const taskColumns = [
    {
      title: "Task Name",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Role",
      dataIndex: "responsible_role",
      key: "role",
      width: 100,
      render: (v: string) => v || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v: string, record: Record<string, unknown>) => (
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
      title: "Due",
      dataIndex: "planned_end",
      key: "due",
      width: 110,
      render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD") : "-"),
    },
  ];

  const issueColumns = [
    { title: "Title", dataIndex: "title", key: "title", ellipsis: true },
    {
      title: "Severity",
      dataIndex: "severity",
      key: "severity",
      width: 90,
      render: (v: string) => <Tag color={severityColors[v]}>{v}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v: string) => <Tag color={issueStatusColors[v]}>{v}</Tag>,
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/projects")}>
          {t("common.back")}
        </Button>
        {["pending_approval", "approved"].includes(project.status) && (
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => submitApprovalMutation.mutate()}
            loading={submitApprovalMutation.isPending}
          >
            Submit for Approval
          </Button>
        )}
        <Button icon={<EditOutlined />} onClick={() => { statusForm.setFieldsValue(project); setEditStatusOpen(true); }}>
          Update Status
        </Button>
      </Space>

      <Card title={project.name} style={{ marginBottom: 16 }}>
        <Descriptions
          items={[
            {
              key: "status",
              label: t("common.status"),
              children: <Tag color={statusColors[project.status]}>{t(`project.status.${project.status}`)}</Tag>,
            },
            {
              key: "type",
              label: "Type",
              children: project.type === "new_product" ? "New Product" : "Version Upgrade",
            },
            { key: "product_id", label: "Product ID", children: project.product_id },
            { key: "approval_id", label: "Approval ID", children: project.approval_id || "-" },
            { key: "feishu_chat_id", label: "Feishu Chat", children: project.feishu_chat_id || "-" },
            {
              key: "created_at",
              label: "Created",
              children: project.created_at ? new Date(project.created_at).toLocaleString() : "-",
            },
          ]}
          column={2}
          bordered
          size="small"
        />
      </Card>

      <Card
        title="WBS Task Tree"
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setTaskModalOpen(true)}>
            Add Task
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        {tasks.length === 0 ? (
          <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>
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
        title="Technical Issues"
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setIssueModalOpen(true)}>
            Report Issue
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        {issues.length === 0 ? (
          <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>
        ) : (
          <Table columns={issueColumns} dataSource={issues} rowKey="id" pagination={false} size="small" />
        )}
      </Card>

      {/* Add Task Modal */}
      <Modal
        title="Add Task"
        open={taskModalOpen}
        onOk={() => taskForm.validateFields().then((v) => createTaskMutation.mutate(v))}
        onCancel={() => { setTaskModalOpen(false); taskForm.resetFields(); }}
        confirmLoading={createTaskMutation.isPending}
      >
        <Form form={taskForm} layout="vertical">
          <Form.Item name="name" label="Task Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parent_task_id" label="Parent Task">
            <Select
              allowClear
              placeholder="None (root task)"
              options={tasks.map((t: Record<string, unknown>) => ({
                label: t.name as string,
                value: t.id as string,
              }))}
            />
          </Form.Item>
          <Form.Item name="responsible_role" label="Responsible Role">
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
            <Form.Item name="planned_start" label="Start">
              <DatePicker />
            </Form.Item>
            <Form.Item name="planned_end" label="End">
              <DatePicker />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Add Issue Modal */}
      <Modal
        title="Report Technical Issue"
        open={issueModalOpen}
        onOk={() => issueForm.validateFields().then((v) => createIssueMutation.mutate(v))}
        onCancel={() => { setIssueModalOpen(false); issueForm.resetFields(); }}
        confirmLoading={createIssueMutation.isPending}
      >
        <Form form={issueForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="severity" label="Severity" initialValue="minor">
            <Select
              options={[
                { label: "Critical", value: "critical" },
                { label: "Major", value: "major" },
                { label: "Minor", value: "minor" },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Status Modal */}
      <Modal
        title="Update Project Status"
        open={editStatusOpen}
        onOk={() => statusForm.validateFields().then((v) => updateStatusMutation.mutate(v))}
        onCancel={() => setEditStatusOpen(false)}
        confirmLoading={updateStatusMutation.isPending}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "Pending Approval", value: "pending_approval" },
                { label: "Approved", value: "approved" },
                { label: "In Progress", value: "in_progress" },
                { label: "Completed", value: "completed" },
                { label: "Closed", value: "closed" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
