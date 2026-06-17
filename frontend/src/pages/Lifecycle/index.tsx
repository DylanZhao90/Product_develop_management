import { useState } from "react";
import { Card, Col, Row, Statistic, Table, Tag, Typography, Space, Select, Button, Modal, Form, Input, message } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "../../services/api";
import { useLocale } from "../../locales";
import type { LifecycleStatus } from "../../services/api-types";

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
      productApi.transitionLifecycle(id, { ...data, to_status: data.to_status as LifecycleStatus } as any),
    onSuccess: () => {
      message.success(t("product.transitionSuccess"));
      setTransitionModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["products-lifecycle"] });
    },
  });

  const products = data?.data?.data || [];
  const total = data?.data?.total || 0;

  const columns = [
    { title: t("lifecycle.code"), dataIndex: "code", key: "code", width: 140 },
    { title: t("lifecycle.model"), dataIndex: "model", key: "model", width: 120 },
    { title: t("lifecycle.name"), dataIndex: "name", key: "name", ellipsis: true },
    {
      title: t("common.status"),
      dataIndex: "lifecycle_status",
      key: "lifecycle_status",
      width: 140,
      render: (v: string) => <Tag color={statusColors[v]}>{t(`product.status.${v}`) || v}</Tag>,
    },
    {
      title: t("lifecycle.action"),
      key: "action",
      width: 160,
      render: (_: unknown, record: Record<string, unknown>) => {
        const nextStatuses = VALID_TRANSITIONS[record.lifecycle_status as string] || [];
        if (nextStatuses.length === 0) return <Typography.Text type="secondary">{t("lifecycle.terminal")}</Typography.Text>;
        return (
          <Button
            size="small"
            icon={<SwapOutlined />}
            onClick={() => { setSelectedProduct(record); setTransitionModalOpen(true); }}
          >
            {t("product.transition")}
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
          {t("menu.lifecycle")}
        </Typography.Title>
        <Typography.Text className="page-header-desc">
          {t("common.total", { count: total })}
        </Typography.Text>
      </div>

      {/* Stat Summary Cards */}
      {(() => {
        const rows = products;
        const counts = { in_development: 0, trial_handover: 0, on_sale: 0, discontinued: 0, eol: 0 };
        rows.forEach((r: any) => {
          const s = r.lifecycle_status as string;
          if (s in counts) counts[s as keyof typeof counts]++;
        });
        const transitionableCount = rows.filter((r: any) =>
          (VALID_TRANSITIONS[r.lifecycle_status as string] || []).length > 0
        ).length;
        return (
          <div style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Total" value={total} valueStyle={{ color: "#4f6ef6", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic
                    title={<span>In Development <Tag color="blue" style={{ fontSize: 10, marginLeft: 4 }}>{counts.in_development}</Tag></span>}
                    value={counts.in_development}
                    valueStyle={{ color: "#1677ff", fontSize: 22, fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Trial Handover" value={counts.trial_handover} valueStyle={{ color: "#fa8c16", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="On Sale" value={counts.on_sale} valueStyle={{ color: "#22c55e", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Discontinued" value={counts.discontinued} valueStyle={{ color: "#ef4444", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="EOL" value={counts.eol} valueStyle={{ color: "#8c8c8c", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Transitionable" value={transitionableCount} valueStyle={{ color: "#1890ff", fontSize: 22, fontWeight: 700 }} suffix={<SwapOutlined style={{ fontSize: 16 }} />} />
                </Card>
              </Col>
            </Row>
          </div>
        );
      })()}

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder={t("common.status")}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            style={{ width: 160 }}
            options={[
              { label: t("common.all"), value: undefined },
              { label: t("product.status.in_development"), value: "in_development" },
              { label: t("product.status.trial_handover"), value: "trial_handover" },
              { label: t("product.status.on_sale"), value: "on_sale" },
              { label: t("product.status.discontinued"), value: "discontinued" },
              { label: t("product.status.eol"), value: "eol" },
            ]}
          />
        </Space>
        <Table
          columns={columns}
          dataSource={products as any}
          rowKey="id"
          loading={isLoading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (totalCount: number) => t("common.total", { count: totalCount }) }}
        />
      </Card>

      <Modal
        title={t("product.transitionTitle")}
        open={transitionModalOpen}
        onOk={() => form.validateFields().then((v) => transitionMutation.mutate({ id: selectedProduct?.id as string, data: v }))}
        onCancel={() => { setTransitionModalOpen(false); setSelectedProduct(null); form.resetFields(); }}
        confirmLoading={transitionMutation.isPending}
      >
        <Typography.Paragraph>
          {t("lifecycle.product")}: <strong>{selectedProduct?.name as string}</strong>
          {" "}({t("common.currentStatus")}: <Tag color={statusColors[selectedProduct?.lifecycle_status as string]}>{t(`product.status.${selectedProduct?.lifecycle_status as string}`)}</Tag>)
        </Typography.Paragraph>
        <Form form={form} layout="vertical">
          <Form.Item name="to_status" label={t("common.newStatus")} rules={[{ required: true }]}>
            <Select
              options={(VALID_TRANSITIONS[selectedProduct?.lifecycle_status as string] || []).map((s) => ({
                label: t(`product.status.${s}`),
                value: s,
              }))}
            />
          </Form.Item>
          <Form.Item name="reason" label={t("common.reason")}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
