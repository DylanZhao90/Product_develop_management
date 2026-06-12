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
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "../../services/api";
import { useLocale } from "../../locales";

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
      message.success("Product updated");
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
  });

  const transitionMutation = useMutation({
    mutationFn: (values: { to_status: string; reason?: string }) =>
      productApi.transitionLifecycle(id!, values),
    onSuccess: () => {
      message.success("Lifecycle transitioned");
      setTransitionModalOpen(false);
      transitionForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["product-logs", id] });
    },
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const product = productResp?.data?.data;
  const logs = logsResp?.data?.data || [];

  if (!product) {
    return <Typography.Text type="danger">Product not found</Typography.Text>;
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
    { key: "code", label: "Product Code", children: product.code },
    { key: "model", label: "Model", children: product.model },
    { key: "name", label: "Name", children: product.name },
    {
      key: "type",
      label: "Type",
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
      label: "Target Markets",
      children: Array.isArray(product.target_markets) && product.target_markets.length > 0
        ? product.target_markets.map((m: string) => <Tag key={m}>{m}</Tag>)
        : "-",
    },
    {
      key: "certifications",
      label: "Certifications Required",
      children: Array.isArray(product.certification_requirements) && product.certification_requirements.length > 0
        ? product.certification_requirements.map((c: string) => <Tag key={c}>{c}</Tag>)
        : "-",
    },
    {
      key: "description",
      label: "Description",
      children: product.description || "-",
      span: 2,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/products")}>
          {t("common.back")}
        </Button>
        <Button icon={<EditOutlined />} onClick={handleEdit}>
          {t("common.edit")}
        </Button>
        {nextStatuses.length > 0 && (
          <Button type="primary" icon={<SwapOutlined />} onClick={handleTransition}>
            Transition Status
          </Button>
        )}
      </Space>

      <Card title={product.name} style={{ marginBottom: 16 }}>
        <Descriptions items={items} column={2} bordered size="small" />
      </Card>

      <Card title="Lifecycle Timeline" style={{ marginBottom: 16 }}>
        {logs.length === 0 ? (
          <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>
        ) : (
          <Timeline
            items={logs.map((log: Record<string, unknown>) => ({
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

      <Card title="Design Files">
        <Typography.Text type="secondary">Design file management coming in Phase 2</Typography.Text>
      </Card>

      {/* Edit Modal */}
      <Modal
        title={`${t("common.edit")} Product`}
        open={editModalOpen}
        onOk={() => editForm.validateFields().then((v) => updateMutation.mutate(v))}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="model" label="Model" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Select
              options={[
                { label: "AC Charger", value: "ac_charger" },
                { label: "DC Charger", value: "dc_charger" },
                { label: "Portable", value: "portable" },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Transition Modal */}
      <Modal
        title="Transition Lifecycle Status"
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
          <Form.Item label="Current Status">
            <Tag color={statusColors[product.lifecycle_status]}>
              {t(`product.status.${product.lifecycle_status}`)}
            </Tag>
          </Form.Item>
          <Form.Item name="to_status" label="New Status" rules={[{ required: true }]}>
            <Select
              options={nextStatuses.map((s) => ({
                label: t(`product.status.${s}`),
                value: s,
              }))}
            />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input.TextArea rows={2} placeholder="Optional reason for this transition" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
