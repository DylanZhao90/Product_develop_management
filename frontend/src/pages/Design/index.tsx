import { useState } from "react";
import { Card, Table, Tag, Typography, Space, Select, Input, Button, Modal, Form, Upload, message } from "antd";
import { SearchOutlined, UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { designApi } from "../../services/api";
import { useLocale } from "../../locales";

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
      message.success("File uploaded");
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
    { title: "File Name", dataIndex: "file_name", key: "file_name", ellipsis: true },
    {
      title: "Type",
      dataIndex: "file_type",
      key: "file_type",
      width: 80,
      render: (v: string) => <Tag>{v?.toUpperCase()}</Tag>,
    },
    { title: "Ver", dataIndex: "version", key: "version", width: 60 },
    {
      title: "Current",
      dataIndex: "is_current",
      key: "is_current",
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">Latest</Tag> : <Tag>Old</Tag>),
    },
    {
      title: "Size",
      dataIndex: "file_size",
      key: "file_size",
      width: 80,
      render: (v: number) => (v ? `${(v / 1024).toFixed(0)} KB` : "-"),
    },
    {
      title: "Uploaded",
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(r.id as string)} />
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>{t("menu.design")}</Typography.Title>
      <Card
        extra={<Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>Upload</Button>}
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Product ID"
            value={productId}
            onChange={(e) => { setProductId(e.target.value || undefined); setPage(1); }}
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            placeholder="File Type"
            value={fileType}
            onChange={(v) => { setFileType(v); setPage(1); }}
            allowClear
            style={{ width: 120 }}
            options={[
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
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (t: number) => `Total ${t}` }}
        />
      </Card>

      <Modal
        title="Upload Design File"
        open={uploadModalOpen}
        onOk={handleUpload}
        onCancel={() => { setUploadModalOpen(false); form.resetFields(); setFileList([]); }}
        confirmLoading={uploadMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="product_id" label="Product ID" rules={[{ required: true }]}>
            <Input placeholder="UUID of the product" />
          </Form.Item>
          <Form.Item label="File" required>
            <Upload beforeUpload={(f) => { setFileList([f]); return false; }} maxCount={1}
              onRemove={() => setFileList([])} fileList={fileList.map((f, i) => ({ uid: String(i), name: f.name }))}>
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="change_notes" label="Change Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
