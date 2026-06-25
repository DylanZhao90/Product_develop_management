import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  Timeline,
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
  CheckCircleFilled,
  CloseCircleFilled,
  ClockCircleFilled,
  MinusCircleFilled,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi, approvalApi, supplierProfileApi } from "../../services/api";
import type { ProjectTask, ApprovalFlowInstance, ApprovalRecord } from "../../services/api-types";
import type { SupplierProfile } from "../../services/api-types";
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

// Supplier lifecycle phases
const SUPPLIER_PHASES = ["research", "evaluation", "onboarding", "cooperation", "termination", "blacklist"] as const;
type SupplierPhase = (typeof SUPPLIER_PHASES)[number];

const PHASE_LABELS_CN: Record<string, string> = {
  research: "考察调研", evaluation: "供应商评估", onboarding: "供应商导入",
  cooperation: "合作管理", termination: "终止合作", blacklist: "退出/黑名单",
};
const PHASE_LABELS_EN: Record<string, string> = {
  research: "Research", evaluation: "Evaluation", onboarding: "Onboarding",
  cooperation: "Cooperation", termination: "Termination", blacklist: "Blacklist",
};

function getHealthColor(score: number | null): string {
  if (score == null) return "default";
  if (score >= 80) return "green";
  if (score >= 60) return "orange";
  return "red";
}

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
  const { t, lang } = useLocale();
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

  // ---- C-8: Approval flow ----
  const [approvalComment, setApprovalComment] = useState("");

  const submitApprovalMutation = useMutation({
    mutationFn: () => approvalApi.submitApproval(id!),
    onSuccess: (res) => {
      if (res.data.success) {
        message.success(t("project.approvalSubmitted"));
      } else {
        message.warning(res.data.message || t("common.failed"));
      }
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["approval-flow", id] });
    },
  });

  const { data: flowResp } = useQuery({
    queryKey: ["approval-flow", id],
    queryFn: () => approvalApi.getFlowStatus(id!),
    enabled: !!id,
  });

  const approvalFlow = flowResp?.data?.data as ApprovalFlowInstance | null;

  const { data: recordsResp } = useQuery({
    queryKey: ["approval-records", approvalFlow?.id],
    queryFn: () => approvalApi.getApprovalRecords(approvalFlow!.id),
    enabled: !!approvalFlow?.id,
  });

  const approvalRecords = (recordsResp?.data?.data as ApprovalRecord[]) || [];

  // ---- Derive project data for early use in hooks ----
  const projectData = projectResp?.data?.data;
  const projectIsSupplier = projectData?.project_type_key === "supplier_management";

  // ---- Supplier lifecycle: profile + phase advance ----
  const { data: supplierProfileResp } = useQuery({
    queryKey: ["supplier-profile-by-project", projectData?.supplier_id],
    queryFn: () => supplierProfileApi.getById(projectData!.supplier_id!),
    enabled: !!projectData?.supplier_id && projectIsSupplier,
  });
  const supplierProfile = supplierProfileResp?.data?.data as SupplierProfile | undefined;

  const phaseAdvanceMutation = useMutation({
    mutationFn: (nextPhase: string) =>
      projectApi.update(id!, { lifecycle_phase: nextPhase }),
    onSuccess: () => {
      message.success(t("common.success"));
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  const langForLabel = (lang || "zh-CN").startsWith("zh") ? PHASE_LABELS_CN : PHASE_LABELS_EN;

  const processApprovalMutation = useMutation({
    mutationFn: ({ recordId, action }: { recordId: string; action: 'approve' | 'reject' | 'return' }) =>
      approvalApi.processApproval(recordId, action, approvalComment),
    onSuccess: () => {
      message.success(t("project.approvalProcessed"));
      setApprovalComment("");
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["approval-flow", id] });
      queryClient.invalidateQueries({ queryKey: ["approval-records"] });
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
        {project.approval_status === 'draft' && (
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

      {/* ---- C-8: Approval Status Card ---- */}
      <Card
        title={
          <Space>
            {t("project.approvalStatus")}
            {(() => {
              const colorMap: Record<string, string> = {
                draft: "default",
                pending: "processing",
                pending_approval: "processing",
                approved: "success",
                rejected: "error",
              };
              const statusKey = project.approval_status === 'pending' ? 'pending_approval' : project.approval_status;
              return <Tag color={colorMap[project.approval_status] || "default"}>{t(`project.status.${statusKey}`)}</Tag>;
            })()}
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {project.approval_status === 'draft' && (
          <div className="empty-state">
            <SendOutlined style={{ fontSize: 40, color: "var(--color-text-muted)", marginBottom: 12 }} />
            <Typography.Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
              {t("project.noApprovalData")}
            </Typography.Text>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => submitApprovalMutation.mutate()}
              loading={submitApprovalMutation.isPending}
            >
              {t("project.submitApproval")}
            </Button>
          </div>
        )}

        {project.approval_status === 'pending' && approvalFlow && (
          <div>
            {(() => {
              const pendingRecords = approvalRecords.filter(r => r.action === 'pending');
              const currentRecord = pendingRecords.length > 0 ? pendingRecords[0] : null;

              return (
                <Timeline>
                  {approvalRecords.map((rec) => {
                    const isCurrent = rec.id === currentRecord?.id;
                    const isCompleted = rec.action !== 'pending';

                    let dot = null;
                    let color: string = 'gray';
                    if (isCompleted && rec.action === 'approve') {
                      dot = <CheckCircleFilled style={{ color: '#22c55e', fontSize: 16 }} />;
                      color = 'green';
                    } else if (isCompleted && (rec.action === 'reject' || rec.action === 'return')) {
                      dot = <CloseCircleFilled style={{ color: '#ef4444', fontSize: 16 }} />;
                      color = 'red';
                    } else if (isCurrent) {
                      dot = <ClockCircleFilled style={{ color: '#1677ff', fontSize: 16 }} />;
                      color = 'blue';
                    } else {
                      dot = <MinusCircleFilled style={{ color: '#d9d9d9', fontSize: 16 }} />;
                    }

                    const nodeLabel = rec.node_name || `Node ${rec.node_order}`;
                    const statusLabel = rec.action === 'pending'
                      ? t("project.waitingForApproval")
                      : rec.action === 'approve'
                        ? t("common.approve")
                        : rec.action === 'reject'
                          ? t("common.reject")
                          : t("common.return");

                    return (
                      <Timeline.Item key={rec.id} dot={dot} color={color}>
                        <div>
                          <div style={{ fontWeight: isCurrent ? 600 : 400 }}>
                            {nodeLabel}
                            <Tag
                              style={{ marginLeft: 8 }}
                              color={isCompleted ? (rec.action === 'approve' ? 'green' : 'red') : isCurrent ? 'processing' : 'default'}
                            >
                              {statusLabel}
                            </Tag>
                          </div>
                          {rec.approver_name && (
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {t("project.approver")}: {rec.approver_name}
                            </Typography.Text>
                          )}
                          {rec.comment && (
                            <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                              {t("common.comment")}: {rec.comment}
                            </div>
                          )}
                          {rec.created_at && (
                            <div style={{ marginTop: 2, fontSize: 11, color: '#999' }}>
                              {dayjs(rec.created_at).format("YYYY-MM-DD HH:mm")}
                            </div>
                          )}

                          {/* Current node action buttons */}
                          {isCurrent && (
                            <div style={{ marginTop: 8 }}>
                              <Input.TextArea
                                rows={2}
                                placeholder={t("project.approvalCommentPlaceholder")}
                                value={approvalComment}
                                onChange={(e) => setApprovalComment(e.target.value)}
                                style={{ marginBottom: 8 }}
                              />
                              <Space>
                                <Button
                                  type="primary"
                                  size="small"
                                  loading={processApprovalMutation.isPending}
                                  onClick={() => processApprovalMutation.mutate({ recordId: rec.id, action: 'approve' })}
                                >
                                  {t("common.approve")}
                                </Button>
                                <Button
                                  danger
                                  size="small"
                                  loading={processApprovalMutation.isPending}
                                  onClick={() => processApprovalMutation.mutate({ recordId: rec.id, action: 'reject' })}
                                >
                                  {t("common.reject")}
                                </Button>
                                <Button
                                  size="small"
                                  loading={processApprovalMutation.isPending}
                                  onClick={() => processApprovalMutation.mutate({ recordId: rec.id, action: 'return' })}
                                >
                                  {t("common.return")}
                                </Button>
                              </Space>
                            </div>
                          )}
                        </div>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              );
            })()}
          </div>
        )}

        {(project.approval_status === 'approved' || project.approval_status === 'rejected') && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Tag
                color={project.approval_status === 'approved' ? 'success' : 'error'}
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                {project.approval_status === 'approved' ? (
                  <><CheckCircleFilled style={{ marginRight: 4 }} />{t("project.approvalResult.approved")}</>
                ) : (
                  <><CloseCircleFilled style={{ marginRight: 4 }} />{t("project.approvalResult.rejected")}</>
                )}
              </Tag>
            </div>
            {approvalRecords.length > 0 && (
              <Timeline>
                {approvalRecords.map((rec) => {
                  const isApproved = rec.action === 'approve';
                  const isRejected = rec.action === 'reject' || rec.action === 'return';
                  let dot = null;
                  let color: string = 'gray';
                  if (isApproved) {
                    dot = <CheckCircleFilled style={{ color: '#22c55e', fontSize: 16 }} />;
                    color = 'green';
                  } else if (isRejected) {
                    dot = <CloseCircleFilled style={{ color: '#ef4444', fontSize: 16 }} />;
                    color = 'red';
                  } else {
                    dot = <MinusCircleFilled style={{ color: '#d9d9d9', fontSize: 16 }} />;
                  }

                  const actionLabel = rec.action === 'approve'
                    ? t("common.approve")
                    : rec.action === 'reject'
                      ? t("common.reject")
                      : rec.action === 'return'
                        ? t("common.return")
                        : t("project.waitingForApproval");

                  return (
                    <Timeline.Item key={rec.id} dot={dot} color={color}>
                      <div>
                        <div>
                          {rec.node_name || `Node ${rec.node_order}`}
                          <Tag style={{ marginLeft: 8 }} color={isApproved ? 'green' : isRejected ? 'red' : 'default'}>
                            {actionLabel}
                          </Tag>
                        </div>
                        {rec.approver_name && (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {t("project.approver")}: {rec.approver_name}
                          </Typography.Text>
                        )}
                        {rec.comment && (
                          <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                            {t("common.comment")}: {rec.comment}
                          </div>
                        )}
                        {rec.created_at && (
                          <div style={{ marginTop: 2, fontSize: 11, color: '#999' }}>
                            {dayjs(rec.created_at).format("YYYY-MM-DD HH:mm")}
                          </div>
                        )}
                      </div>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            )}
            {approvalRecords.length === 0 && (
              <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>
            )}
          </div>
        )}
      </Card>

      {/* ---- Supplier Lifecycle Timeline ---- */}
      {projectIsSupplier && (
        <Card title={t("menu.lifecycleSupplier")} style={{ marginBottom: 16 }}>
          {/* Phase Steps */}
          <Steps
            size="small"
            current={SUPPLIER_PHASES.indexOf((project?.lifecycle_phase || "research") as SupplierPhase)}
            style={{ marginBottom: 16 }}
            items={SUPPLIER_PHASES.map((phase, idx) => {
              const currentPhase = project?.lifecycle_phase || "research";
              const currentIdx = SUPPLIER_PHASES.indexOf(currentPhase as SupplierPhase);
              const isCompleted = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const phaseLabel = langForLabel[phase] || phase;
              return {
                title: phaseLabel,
                status: isCompleted ? "finish" : isCurrent ? "process" : "wait",
                icon: isCompleted ? (
                  <CheckCircleFilled style={{ color: "#22c55e", fontSize: 14 }} />
                ) : isCurrent ? (
                  <ClockCircleFilled style={{ color: "#1677ff", fontSize: 14 }} />
                ) : (
                  <MinusCircleFilled style={{ color: "#d9d9d9", fontSize: 14 }} />
                ),
              };
            })}
          />

          {/* Next phase action */}
          <Space>
            {(() => {
              const currentPhase = project?.lifecycle_phase || "research";
              const currentIdx = SUPPLIER_PHASES.indexOf(currentPhase as SupplierPhase);
              if (currentIdx < 0 || currentIdx >= SUPPLIER_PHASES.length - 1) return null;
              const nextPhase = SUPPLIER_PHASES[currentIdx + 1];
              const nextLabel = langForLabel[nextPhase] || nextPhase;
              const isCooperation = nextPhase === "cooperation";
              return (
                <Button
                  type="primary"
                  size="small"
                  loading={phaseAdvanceMutation.isPending}
                  onClick={() => {
                    if (isCooperation) {
                      // cooperation: auto-advance, no approval needed
                      phaseAdvanceMutation.mutate(nextPhase);
                    } else {
                      // other phases: submit approval first
                      phaseAdvanceMutation.mutate(nextPhase);
                    }
                  }}
                >
                  {isCooperation
                    ? `进入 ${nextLabel}`
                    : `推进至 ${nextLabel} (需审批)`}
                </Button>
              );
            })()}
            {(() => {
              const currentPhase = project?.lifecycle_phase || "research";
              if (currentPhase === "termination" || currentPhase === "blacklist") {
                return (
                  <Typography.Text type="secondary">终态 — 无后续阶段</Typography.Text>
                );
              }
              return null;
            })()}
          </Space>

          {/* Health dashboard at cooperation phase */}
          {supplierProfile && (project?.lifecycle_phase === "cooperation") && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--color-bg-card)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
              <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                {t("supplier.healthScore")}
              </Typography.Text>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title={t("supplier.healthScore")}
                    value={supplierProfile.health_score ?? "-"}
                    suffix="/100"
                    valueStyle={{ color: getHealthColor(supplierProfile.health_score) === "green" ? "#22c55e" : getHealthColor(supplierProfile.health_score) === "orange" ? "#fa8c16" : "#ef4444" }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic title={t("supplier.rating")} value={supplierProfile.rating ?? "-"} suffix="/5" />
                </Col>
                <Col span={6}>
                  <Statistic title={t("supplier.onTimeDelivery")} value={supplierProfile.on_time_delivery_rate ?? "-"} suffix="%" />
                </Col>
                <Col span={6}>
                  <Statistic title="质量合格率" value={supplierProfile.quality_pass_rate ?? "-"} suffix="%" />
                </Col>
              </Row>
            </div>
          )}
        </Card>
      )}

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
