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
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  FileTextOutlined,
  SwapOutlined,
  SwapOutlined as TimelineIcon,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "../../services/api";
import { useLocale } from "../../locales";
import type { LifecycleStatus } from "../../services/api-types";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";

const statusColors: Record<string, string> = {
  in_development: "blue",
  trial_handover: "orange",
  on_sale: "green",
  discontinued: "red",
  eol: "default",
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  in_development: ["trial_handover"],
  trial_handover: ["in_development", "on_sale"],
  on_sale: ["discontinued"],
  discontinued: ["eol"],
  eol: [],
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [transitionForm] = Form.useForm();

  const { data: productResp, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productApi.get(id!),
    enabled: !!id,
  });

  const { data: logsResp } = useQuery({
    queryKey: ["product-logs", id],
    queryFn: () => productApi.getLifecycleLogs(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => productApi.update(id!, values),
    onSuccess: () => {
      message.success(t("product.updatedSuccess"));
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
  });

  const transitionMutation = useMutation({
    mutationFn: (values: { to_status: string; reason?: string }) =>
      productApi.transitionLifecycle(id!, { ...values, to_status: values.to_status as LifecycleStatus } as any),
    onSuccess: () => {
      message.success(t("product.transitionSuccess"));
      setTransitionModalOpen(false);
      transitionForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["product-logs", id] });
    },
  });

  if (isLoading) {
    return <LoadingSkeleton detail />;
  }

  const product = productResp?.data?.data;
  const logs = logsResp?.data?.data || [];

  if (!product) {
    return <Typography.Text type="danger">{t("common.notFound")}</Typography.Text>;
  }

  const nextStatuses = VALID_TRANSITIONS[product.lifecycle_status] || [];

  const handleEdit = () => {
    editForm.setFieldsValue(product);
    setEditModalOpen(true);
  };

  const handleTransition = () => {
    setTransitionModalOpen(true);
  };

  const items = [
    { key: "code", label: t("product.code"), children: product.code },
    { key: "model", label: t("product.model"), children: product.model },
    { key: "name", label: t("product.name"), children: product.name },
    {
      key: "type",
      label: t("product.type"),
      children: (
        <Tag>
          {product.type === "ac_charger" ? "AC" : product.type === "dc_charger" ? "DC" : product.type === "portable" ? "Portable" : product.type || "-"}
        </Tag>
      ),
    },
    {
      key: "status",
      label: t("common.status"),
      children: <Tag color={statusColors[product.lifecycle_status]}>{t(`product.status.${product.lifecycle_status}`)}</Tag>,
    },
    {
      key: "markets",
      label: t("product.targetMarkets"),
      children: Array.isArray(product.target_markets) && product.target_markets.length > 0
        ? product.target_markets.map((m: string) => <Tag key={m}>{m}</Tag>)
        : "-",
    },
    {
      key: "certifications",
      label: t("product.certificationRequirements"),
      children: Array.isArray(product.certification_requirements) && product.certification_requirements.length > 0
        ? product.certification_requirements.map((c: string) => <Tag key={c}>{c}</Tag>)
        : "-",
    },
    {
      key: "description",
      label: t("product.description"),
      children: product.description || "-",
      span: 2,
    },
  ];

  return (
    <div>
      {/* Page Header with back button and product name */}
      <div className="page-header">
        <Space align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/products")}>
            {t("common.back")}
          </Button>
          <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
            {product.name}
          </Typography.Title>
        </Space>
      </div>

      {/* Action buttons */}
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<EditOutlined />} onClick={handleEdit}>
          {t("common.edit")}
        </Button>
        {nextStatuses.length > 0 && (
          <Button type="primary" icon={<SwapOutlined />} onClick={handleTransition}>
            {t("product.transition")}
          </Button>
        )}
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions items={items} column={2} bordered size="small" />
      </Card>

      <Card title={t("product.lifecycleTitle")} style={{ marginBottom: 16 }}>
        {logs.length === 0 ? (
          <div className="empty-state">
            <TimelineIcon style={{ fontSize: 40, color: "var(--color-text-muted)", marginBottom: 12 }} />
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              {t("common.noData")}
            </Typography.Text>
          </div>
        ) : (
          <Timeline
            items={logs.map((log: any) => ({
              color: log.to_status === "eol" ? "red" : "blue",
              children: (
                <div>
                  <Typography.Text strong>
                    {t(`product.status.${log.from_status as string}`)} →{" "}
                    {t(`product.status.${log.to_status as string}`)}
                  </Typography.Text>
                  {(log.reason as string) && (
                    <Typography.Paragraph type="secondary" style={{ margin: "4px 0" }}>
                      {log.reason as string}
                    </Typography.Paragraph>
                  )}
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(log.changed_at as string).toLocaleString()}
                  </Typography.Text>
                </div>
              ),
            }))}
          />
        )}
      </Card>

      <Card title={t("product.designFilesTitle")}>
        <div className="empty-state">
          <FileTextOutlined style={{ fontSize: 40, color: "var(--color-text-muted)", marginBottom: 12 }} />
          <Typography.Text type="secondary" style={{ fontSize: 14 }}>
            {t("product.designFilesComing")}
          </Typography.Text>
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal
        title={t("product.editTitle")}
        open={editModalOpen}
        onOk={() => editForm.validateFields().then((v) => updateMutation.mutate(v))}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={editForm} layout="vertical">
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
          <Form.Item name="description" label={t("product.description")}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Transition Modal */}
      <Modal
        title={t("product.transitionTitle")}
        open={transitionModalOpen}
        onOk={() =>
          transitionForm.validateFields().then((v) => transitionMutation.mutate(v))
        }
        onCancel={() => {
          setTransitionModalOpen(false);
          transitionForm.resetFields();
        }}
        confirmLoading={transitionMutation.isPending}
      >
        <Form form={transitionForm} layout="vertical">
          <Form.Item label={t("common.currentStatus")}>
            <Tag color={statusColors[product.lifecycle_status]}>
              {t(`product.status.${product.lifecycle_status}`)}
            </Tag>
          </Form.Item>
          <Form.Item name="to_status" label={t("common.newStatus")} rules={[{ required: true }]}>
            <Select
              options={nextStatuses.map((s) => ({
                label: t(`product.status.${s}`),
                value: s,
              }))}
            />
          </Form.Item>
          <Form.Item name="reason" label={t("common.reason")}>
            <Input.TextArea rows={2} placeholder={t("product.transitionReasonPlaceholder")} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
