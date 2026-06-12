import { useState } from "react";
import { Card, Table, Tag, Typography, Space, Select, Button, Modal, Form, Input, message } from "antd";
import { SwapOutlined } from "@ant-design/icons";
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

export default function Lifecycle() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["products-lifecycle", page, statusFilter],
    queryFn: () => productApi.list({ page, page_size: 20, status: statusFilter }),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      productApi.transitionLifecycle(id, data as { to_status: string; reason?: string }),
    onSuccess: () => {
      message.success("Lifecycle transitioned");
      setTransitionModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["products-lifecycle"] });
    },
  });

  const products = data?.data?.data || [];
  const total = data?.data?.total || 0;

  const columns = [
    { title: "Code", dataIndex: "code", key: "code", width: 140 },
    { title: "Model", dataIndex: "model", key: "model", width: 120 },
    { title: "Name", dataIndex: "name", key: "name", ellipsis: true },
    {
      title: t("common.status"),
      dataIndex: "lifecycle_status",
      key: "lifecycle_status",
      width: 140,
      render: (v: string) => <Tag color={statusColors[v]}>{t(`product.status.${v}`) || v}</Tag>,
    },
    {
      title: "Action",
      key: "action",
      width: 160,
      render: (_: unknown, record: Record<string, unknown>) => {
        const nextStatuses = VALID_TRANSITIONS[record.lifecycle_status as string] || [];
        if (nextStatuses.length === 0) return <Typography.Text type="secondary">Terminal</Typography.Text>;
        return (
          <Button
            size="small"
            icon={<SwapOutlined />}
            onClick={() => { setSelectedProduct(record); setTransitionModalOpen(true); }}
          >
            Transition
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>{t("menu.lifecycle")}</Typography.Title>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            allowClear
            style={{ width: 160 }}
            options={[
              { label: "In Development", value: "in_development" },
              { label: "Trial Handover", value: "trial_handover" },
              { label: "On Sale", value: "on_sale" },
              { label: "Discontinued", value: "discontinued" },
              { label: "EOL", value: "eol" },
            ]}
          />
        </Space>
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={isLoading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (t: number) => `Total ${t}` }}
        />
      </Card>

      <Modal
        title="Transition Lifecycle Status"
        open={transitionModalOpen}
        onOk={() => form.validateFields().then((v) => transitionMutation.mutate({ id: selectedProduct?.id as string, data: v }))}
        onCancel={() => { setTransitionModalOpen(false); setSelectedProduct(null); form.resetFields(); }}
        confirmLoading={transitionMutation.isPending}
      >
        <Typography.Paragraph>
          Product: <strong>{selectedProduct?.name as string}</strong>
          {" "}(Current: <Tag color={statusColors[selectedProduct?.lifecycle_status as string]}>{t(`product.status.${selectedProduct?.lifecycle_status as string}`)}</Tag>)
        </Typography.Paragraph>
        <Form form={form} layout="vertical">
          <Form.Item name="to_status" label="New Status" rules={[{ required: true }]}>
            <Select
              options={(VALID_TRANSITIONS[selectedProduct?.lifecycle_status as string] || []).map((s) => ({
                label: t(`product.status.${s}`),
                value: s,
              }))}
            />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
