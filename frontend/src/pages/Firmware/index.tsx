import { useState } from "react";
import { Card, Table, Tag, Typography, Space, Input, Button, Modal, Form, Select, Progress, Upload, message, Tabs } from "antd";
import { PlusOutlined, CloudUploadOutlined, UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { firmwareApi } from "../../services/api";
import { useLocale } from "../../locales";

export default function Firmware() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("versions");
  const [page, setPage] = useState(1);
  const [modelFilter, setModelFilter] = useState<string | undefined>();
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [otaModalOpen, setOtaModalOpen] = useState(false);
  const [versionForm] = Form.useForm();
  const [otaForm] = Form.useForm();
  const [fwFile, setFwFile] = useState<File | null>(null);

  const { data: versionsResp, isLoading: vLoading } = useQuery({
    queryKey: ["firmware-versions", page, modelFilter],
    queryFn: () => firmwareApi.listVersions({ page, page_size: 20, product_model: modelFilter }),
    enabled: activeTab === "versions",
  });

  const { data: tasksResp, isLoading: tLoading } = useQuery({
    queryKey: ["firmware-upgrade-tasks", page],
    queryFn: () => firmwareApi.listUpgradeTasks({ page, page_size: 20 }),
    enabled: activeTab === "tasks",
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => firmwareApi.uploadFirmware(formData),
    onSuccess: () => {
      message.success("Firmware uploaded");
      setVersionModalOpen(false);
      versionForm.resetFields();
      setFwFile(null);
      queryClient.invalidateQueries({ queryKey: ["firmware-versions"] });
    },
  });

  const createOtaMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) => firmwareApi.createUpgradeTask(v),
    onSuccess: () => {
      message.success("OTA task created");
      setOtaModalOpen(false);
      otaForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["firmware-upgrade-tasks"] });
    },
  });

  const handleUploadFirmware = () => {
    versionForm.validateFields().then((values) => {
      const fd = new FormData();
      fd.append("file", fwFile!);
      fd.append("product_model", values.product_model);
      fd.append("version", values.version);
      fd.append("release_notes", values.release_notes || "");
      fd.append("release_type", values.release_type || "full");
      uploadMutation.mutate(fd);
    });
  };

  const handleDownload = (versionId: string) => {
    firmwareApi.getVersion(versionId).then((resp) => {
      const url = resp.data?.data?.download_url;
      if (url) window.open(url, "_blank");
    });
  };

  const versionColumns = [
    { title: "Model", dataIndex: "product_model", key: "product_model", width: 120 },
    { title: "Version", dataIndex: "version", key: "version", width: 100 },
    {
      title: "Type",
      dataIndex: "release_type",
      key: "release_type",
      width: 90,
      render: (v: string) => <Tag color={v === "full" ? "blue" : "green"}>{v}</Tag>,
    },
    {
      title: "Hash",
      dataIndex: "file_hash",
      key: "file_hash",
      width: 120,
      ellipsis: true,
      render: (v: string) => v ? v.substring(0, 12) + "..." : "-",
    },
    { title: "Release Notes", dataIndex: "release_notes", key: "release_notes", ellipsis: true },
    {
      title: "Released",
      dataIndex: "released_at",
      key: "released_at",
      width: 150,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
    {
      title: "",
      key: "action",
      width: 50,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(r.id as string)} />
      ),
    },
  ];

  const taskColumns = [
    { title: "Firmware ID", dataIndex: "firmware_version_id", key: "firmware_version_id", width: 120, ellipsis: true },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v: string) => {
        const colors: Record<string, string> = { scheduled: "blue", in_progress: "processing", completed: "green", failed: "red" };
        return <Tag color={colors[v]}>{v}</Tag>;
      },
    },
    {
      title: "Progress",
      key: "progress",
      width: 150,
      render: (_: unknown, r: Record<string, unknown>) => {
        const pct = r.total_count ? Math.round((r.success_count as number) / (r.total_count as number) * 100) : (r.status === "completed" ? 100 : 0);
        return <Progress percent={pct} size="small" status={r.status === "failed" ? "exception" : undefined} />;
      },
    },
    { title: "Gray", dataIndex: "gray_scale_percent", key: "gray", width: 60, render: (v: number) => `${v}%` },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
  ];

  const versions = versionsResp?.data?.data || [];
  const vTotal = versionsResp?.data?.total || 0;
  const tasks = tasksResp?.data?.data || [];
  const tTotal = tasksResp?.data?.total || 0;

  return (
    <div>
      <Typography.Title level={4}>{t("menu.firmware")}</Typography.Title>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} tabBarExtraContent={
          activeTab === "versions"
            ? <Button type="primary" icon={<UploadOutlined />} onClick={() => setVersionModalOpen(true)}>Upload Firmware</Button>
            : <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setOtaModalOpen(true)}>New OTA Task</Button>
        }>
          <Tabs.TabPane tab="Versions" key="versions">
            <Space style={{ marginBottom: 16 }}>
              <Input placeholder="Filter by model" value={modelFilter}
                onChange={(e) => { setModelFilter(e.target.value || undefined); setPage(1); }}
                style={{ width: 200 }} allowClear />
            </Space>
            <Table columns={versionColumns} dataSource={versions} rowKey="id" loading={vLoading}
              pagination={{ current: page, pageSize: 20, total: vTotal, onChange: setPage, showTotal: (t: number) => `Total ${t}` }} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="OTA Tasks" key="tasks">
            <Table columns={taskColumns} dataSource={tasks} rowKey="id" loading={tLoading}
              pagination={{ current: page, pageSize: 20, total: tTotal, onChange: setPage, showTotal: (t: number) => `Total ${t}` }} />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      <Modal title="Upload Firmware" open={versionModalOpen}
        onOk={handleUploadFirmware}
        onCancel={() => { setVersionModalOpen(false); versionForm.resetFields(); setFwFile(null); }}
        confirmLoading={uploadMutation.isPending}
        okText="Upload"
      >
        <Form form={versionForm} layout="vertical">
          <Form.Item name="product_model" label="Product Model" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="version" label="Version" rules={[{ required: true }]}><Input placeholder="e.g. 1.2.3" /></Form.Item>
          <Form.Item label="Firmware Binary" required>
            <Upload beforeUpload={(f) => { setFwFile(f); return false; }} maxCount={1}
              onRemove={() => setFwFile(null)}
              fileList={fwFile ? [{ uid: "0", name: fwFile.name }] : []}>
              <Button icon={<UploadOutlined />}>Select .bin File</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="release_type" label="Release Type" initialValue="full">
            <Select options={[{ label: "Full", value: "full" }, { label: "Incremental", value: "incremental" }]} />
          </Form.Item>
          <Form.Item name="release_notes" label="Release Notes"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="New OTA Upgrade Task" open={otaModalOpen}
        onOk={() => otaForm.validateFields().then((v) => createOtaMutation.mutate(v))}
        onCancel={() => { setOtaModalOpen(false); otaForm.resetFields(); }}
        confirmLoading={createOtaMutation.isPending}>
        <Form form={otaForm} layout="vertical">
          <Form.Item name="firmware_version_id" label="Firmware Version ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="gray_scale_percent" label="Gray Scale %" initialValue={100}>
            <Select options={[1, 5, 10, 25, 50, 100].map((n) => ({ label: `${n}%`, value: n }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
