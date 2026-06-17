import { useState } from "react";
import { Card, Col, Row, Statistic, Table, Tag, Typography, Space, Select, Input, Button, Modal, Form, Upload, message } from "antd";
import { SearchOutlined, UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { designApi } from "../../services/api";
import { useLocale } from "../../locales";

const fileTypeColors: Record<string, string> = {
  step: "blue",
  igs: "cyan",
  pdf: "red",
  stl: "purple",
  dxf: "orange",
};

export default function Design() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [productId, setProductId] = useState<string | undefined>();
  const [fileType, setFileType] = useState<string | undefined>();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<File[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["design-files", page, productId, fileType],
    queryFn: () => designApi.list({ page, page_size: 20, product_id: productId, file_type: fileType }),
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => designApi.upload(formData),
    onSuccess: () => {
      message.success(t("design.uploadSuccess"));
      setUploadModalOpen(false);
      form.resetFields();
      setFileList([]);
      queryClient.invalidateQueries({ queryKey: ["design-files"] });
    },
  });

  const handleUpload = () => {
    form.validateFields().then((values) => {
      const fd = new FormData();
      fd.append("file", fileList[0]);
      fd.append("product_id", values.product_id);
      fd.append("change_notes", values.change_notes || "");
      uploadMutation.mutate(fd);
    });
  };

  const handleDownload = (fileId: string) => {
    designApi.download(fileId).then((resp) => {
      const url = resp.data?.data?.download_url;
      if (url) window.open(url, "_blank");
    });
  };

  const files = data?.data?.data || [];
  const total = data?.data?.total || 0;

  const columns = [
    { title: t("design.fileName"), dataIndex: "file_name", key: "file_name", ellipsis: true },
    {
      title: t("design.fileType"),
      dataIndex: "file_type",
      key: "file_type",
      width: 80,
      render: (v: string) => <Tag color={fileTypeColors[v?.toLowerCase()] || "default"}>{v?.toUpperCase()}</Tag>,
    },
    { title: t("design.version"), dataIndex: "version", key: "version", width: 60 },
    {
      title: t("design.current"),
      dataIndex: "is_current",
      key: "is_current",
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">{t("design.latest")}</Tag> : <Tag>{t("design.old")}</Tag>),
    },
    {
      title: t("design.size"),
      dataIndex: "file_size",
      key: "file_size",
      width: 80,
      render: (v: number) => (v ? `${(v / 1024).toFixed(0)} KB` : "-"),
    },
    {
      title: t("design.uploaded"),
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
    {
      title: t("common.actions"),
      key: "action",
      width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(r.id as string)} />
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
          {t("menu.design")}
        </Typography.Title>
        <Typography.Text className="page-header-desc">
          {t("common.total", { count: total })}
        </Typography.Text>
      </div>

      {/* Stat Summary Cards */}
      {(() => {
        const rows = files;
        const fileTypeCounts: Record<string, number> = {};
        let currentCount = 0;
        rows.forEach((r: Record<string, unknown>) => {
          const ft = (r.file_type as string)?.toLowerCase();
          if (ft) fileTypeCounts[ft] = (fileTypeCounts[ft] || 0) + 1;
          if (r.is_current) currentCount++;
        });
        return (
          <div style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Total Files" value={total} valueStyle={{ color: "#4f6ef6", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Current" value={currentCount} valueStyle={{ color: "#22c55e", fontSize: 22, fontWeight: 700 }} suffix={<Tag color="green" style={{ fontSize: 10 }}>Latest</Tag>} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Archived" value={rows.length - currentCount} valueStyle={{ color: "#8c8c8c", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              {Object.entries(fileTypeCounts).map(([ft, cnt]) => (
                <Col xs={12} sm={6} lg={3} key={ft}>
                  <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                    <Statistic title={ft.toUpperCase()} value={cnt} valueStyle={{ color: fileTypeColors[ft] || "#4f6ef6", fontSize: 22, fontWeight: 700 }} />
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        );
      })()}

      <Card
        extra={<Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>{t("common.upload")}</Button>}
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder={t("design.productId")}
            value={productId}
            onChange={(e) => { setProductId(e.target.value || undefined); setPage(1); }}
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            placeholder={t("design.fileType")}
            value={fileType}
            onChange={(v) => { setFileType(v); setPage(1); }}
            style={{ width: 120 }}
            options={[
              { label: t("common.all"), value: undefined },
              { label: "STEP", value: "step" },
              { label: "IGS", value: "igs" },
              { label: "PDF", value: "pdf" },
              { label: "STL", value: "stl" },
              { label: "DXF", value: "dxf" },
            ]}
          />
        </Space>
        <Table
          columns={columns}
          dataSource={files}
          rowKey="id"
          loading={isLoading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (total: number) => t("common.total", { count: total }) }}
        />
      </Card>

      <Modal
        title={t("design.uploadDesignFile")}
        open={uploadModalOpen}
        onOk={handleUpload}
        onCancel={() => { setUploadModalOpen(false); form.resetFields(); setFileList([]); }}
        confirmLoading={uploadMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="product_id" label={t("design.productId")} rules={[{ required: true }]}>
            <Input placeholder={t("design.productIdHint")} />
          </Form.Item>
          <Form.Item label={t("design.file")} required>
            <Upload beforeUpload={(f) => { setFileList([f]); return false; }} maxCount={1}
              onRemove={() => setFileList([])} fileList={fileList.map((f, i) => ({ uid: String(i), name: f.name }))}>
              <Button icon={<UploadOutlined />}>{t("design.selectFile")}</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="change_notes" label={t("design.changeNotes")}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
