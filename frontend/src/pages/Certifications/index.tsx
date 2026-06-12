import { useState } from "react";
import { Card, Table, Tag, Typography, Space, Select, Input, Button, Modal, Form, DatePicker, message } from "antd";
import { PlusOutlined, SearchOutlined, WarningOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { certApi } from "../../services/api";
import dayjs from "dayjs";

const statusColors: Record<string, string> = { valid: "green", expiring_soon: "orange", expired: "red" };
const certTypeLabels: Record<string, string> = { CE: "CE", FCC: "FCC", UL: "UL", RoHS: "RoHS" };

export default function Certifications() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [productId, setProductId] = useState<string | undefined>();
  const [certType, setCertType] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["certifications", page, productId, certType, statusFilter],
    queryFn: () => certApi.list({ page, page_size: 20, product_id: productId, cert_type: certType, status: statusFilter }),
  });

  const { data: expiringResp } = useQuery({
    queryKey: ["certifications-expiring"],
    queryFn: () => certApi.expiring(90),
  });

  const createMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) => certApi.create(v),
    onSuccess: () => { message.success("Certification added"); setModalOpen(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ["certifications"] }); },
  });

  const certs = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const expiring = expiringResp?.data?.data || [];

  const columns = [
    {
      title: "Type",
      dataIndex: "cert_type",
      key: "cert_type",
      width: 80,
      render: (v: string) => <Tag>{certTypeLabels[v] || v}</Tag>,
    },
    { title: "Number", dataIndex: "cert_number", key: "cert_number", width: 140, render: (v: string) => v || "-" },
    { title: "Issued By", dataIndex: "issued_by", key: "issued_by", width: 120, render: (v: string) => v || "-" },
    {
      title: "Issue Date",
      dataIndex: "issue_date",
      key: "issue_date",
      width: 110,
      render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD") : "-"),
    },
    {
      title: "Expiry",
      dataIndex: "expiry_date",
      key: "expiry_date",
      width: 110,
      render: (v: string) => {
        if (!v) return "-";
        const d = dayjs(v);
        const diff = d.diff(dayjs(), "day");
        return <span style={{ color: diff < 30 ? "red" : diff < 90 ? "orange" : undefined }}>{d.format("YYYY-MM-DD")}</span>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v: string) => <Tag color={statusColors[v]}>{v}</Tag>,
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Certifications</Typography.Title>

      {expiring.length > 0 && (
        <Card style={{ marginBottom: 16, border: "1px solid #faad14" }} title={<span><WarningOutlined style={{ color: "#faad14" }} /> Expiring Soon</span>}>
          <Table columns={columns} dataSource={expiring} rowKey="id" pagination={false} size="small" />
        </Card>
      )}

      <Card
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Add Certification</Button>}
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input placeholder="Product ID" value={productId}
            onChange={(e) => { setProductId(e.target.value || undefined); setPage(1); }}
            prefix={<SearchOutlined />} style={{ width: 280 }} allowClear />
          <Select placeholder="Type" value={certType} onChange={(v) => { setCertType(v); setPage(1); }} allowClear style={{ width: 120 }}
            options={["CE", "FCC", "UL", "RoHS"].map((v) => ({ label: v, value: v }))} />
          <Select placeholder="Status" value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} allowClear style={{ width: 140 }}
            options={[{ label: "Valid", value: "valid" }, { label: "Expiring Soon", value: "expiring_soon" }, { label: "Expired", value: "expired" }]} />
        </Space>
        <Table columns={columns} dataSource={certs} rowKey="id" loading={isLoading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (t: number) => `Total ${t}` }} />
      </Card>

      <Modal title="Add Certification" open={modalOpen}
        onOk={() => form.validateFields().then((v) => createMutation.mutate({ ...v, issue_date: v.issue_date?.format("YYYY-MM-DD"), expiry_date: v.expiry_date?.format("YYYY-MM-DD") }))}
        onCancel={() => { setModalOpen(false); form.resetFields(); }} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="product_id" label="Product ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="cert_type" label="Type" rules={[{ required: true }]}>
            <Select options={["CE", "FCC", "UL", "RoHS"].map((v) => ({ label: v, value: v }))} />
          </Form.Item>
          <Form.Item name="cert_number" label="Cert Number"><Input /></Form.Item>
          <Form.Item name="issued_by" label="Issued By"><Input /></Form.Item>
          <Form.Item name="issue_date" label="Issue Date"><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="expiry_date" label="Expiry Date"><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="remind_before_days" label="Remind Before (days)" initialValue={90}>
            <Select options={[30, 60, 90, 180].map((n) => ({ label: `${n} days`, value: n }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
