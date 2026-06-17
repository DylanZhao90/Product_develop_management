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
      message.success(t("firmware.uploadSuccess"));
      setVersionModalOpen(false);
      versionForm.resetFields();
      setFwFile(null);
      queryClient.invalidateQueries({ queryKey: ["firmware-versions"] });
    },
  });

  const createOtaMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) => firmwareApi.createUpgradeTask(v),
    onSuccess: () => {
      message.success(t("firmware.otaCreated"));
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
      const url = (resp.data?.data as any)?.download_url;
      if (url) window.open(url, "_blank");
    });
  };

  const versionColumns = [
    { title: t("firmware.model"), dataIndex: "product_model", key: "product_model", width: 120 },
    { title: t("firmware.version"), dataIndex: "version", key: "version", width: 100 },
    {
      title: t("firmware.releaseType"),
      dataIndex: "release_type",
      key: "release_type",
      width: 90,
      render: (v: string) => <Tag color={v === "full" ? "blue" : "green"}>{v}</Tag>,
    },
    {
      title: t("firmware.hash"),
      dataIndex: "file_hash",
      key: "file_hash",
      width: 120,
      ellipsis: true,
      render: (v: string) => (v ? v.substring(0, 12) + "..." : "-"),
    },
    { title: t("firmware.releaseNotes"), dataIndex: "release_notes", key: "release_notes", ellipsis: true },
    {
      title: t("firmware.released"),
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
    { title: t("firmware.version") + " ID", dataIndex: "firmware_version_id", key: "firmware_version_id", width: 120, ellipsis: true },
    {
      title: t("common.status"),
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v: string) => {
        const colors: Record<string, string> = { scheduled: "blue", in_progress: "processing", completed: "green", failed: "red" };
        return <Tag color={colors[v]}>{v}</Tag>;
      },
    },
    {
      title: t("firmware.progress"),
      key: "progress",
      width: 150,
      render: (_: unknown, r: Record<string, unknown>) => {
        const pct = r.total_count ? Math.round((r.success_count as number) / (r.total_count as number) * 100) : (r.status === "completed" ? 100 : 0);
        return <Progress percent={pct} size="small" status={r.status === "failed" ? "exception" : undefined} />;
      },
    },
    { title: t("firmware.grayScale"), dataIndex: "gray_scale_percent", key: "gray", width: 60, render: (v: number) => `${v}%` },
    {
      title: t("firmware.created"),
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
      <div className="page-header">
        <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
          {t("menu.firmware")}
        </Typography.Title>
        <Typography.Text className="page-header-desc">
          {t("common.total", { count: vTotal })}
        </Typography.Text>
      </div>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} tabBarExtraContent={
          activeTab === "versions"
            ? <Button type="primary" icon={<UploadOutlined />} onClick={() => setVersionModalOpen(true)}>{t("common.upload")} {t("menu.firmware")}</Button>
            : <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setOtaModalOpen(true)}>{t("common.create")} {t("firmware.otaTasks")}</Button>
        }>
          <Tabs.TabPane tab={t("firmware.versions")} key="versions">
            <Space style={{ marginBottom: 16 }}>
              <Input placeholder={t("firmware.model")} value={modelFilter}
                onChange={(e) => { setModelFilter(e.target.value || undefined); setPage(1); }}
                style={{ width: 200 }} allowClear />
            </Space>
            <Table columns={versionColumns} dataSource={versions as any} rowKey="id" loading={vLoading}
              pagination={{ current: page, pageSize: 20, total: vTotal, onChange: setPage, showTotal: (total: number) => t("common.total", { count: total }) }} />
          </Tabs.TabPane>
          <Tabs.TabPane tab={t("firmware.otaTasks")} key="tasks">
            <Table columns={taskColumns} dataSource={tasks as any} rowKey="id" loading={tLoading}
              pagination={{ current: page, pageSize: 20, total: tTotal, onChange: setPage, showTotal: (total: number) => t("common.total", { count: total }) }} />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      <Modal title={`${t("common.upload")} ${t("menu.firmware")}`} open={versionModalOpen}
        onOk={handleUploadFirmware}
        onCancel={() => { setVersionModalOpen(false); versionForm.resetFields(); setFwFile(null); }}
        confirmLoading={uploadMutation.isPending}
        okText={t("common.upload")}
      >
        <Form form={versionForm} layout="vertical">
          <Form.Item name="product_model" label={t("firmware.model")} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="version" label={t("firmware.version")} rules={[{ required: true }]}><Input placeholder="e.g. 1.2.3" /></Form.Item>
          <Form.Item label="Firmware Binary" required>
            <Upload beforeUpload={(f) => { setFwFile(f); return false; }} maxCount={1}
              onRemove={() => setFwFile(null)}
              fileList={fwFile ? [{ uid: "0", name: fwFile.name }] : []}>
              <Button icon={<UploadOutlined />}>{t("common.upload")}</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="release_type" label={t("firmware.releaseType")} initialValue="full">
            <Select options={[{ label: "Full", value: "full" }, { label: "Incremental", value: "incremental" }]} />
          </Form.Item>
          <Form.Item name="release_notes" label={t("firmware.releaseNotes")}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`${t("common.create")} ${t("firmware.otaTasks")}`} open={otaModalOpen}
        onOk={() => otaForm.validateFields().then((v) => createOtaMutation.mutate(v))}
        onCancel={() => { setOtaModalOpen(false); otaForm.resetFields(); }}
        confirmLoading={createOtaMutation.isPending}>
        <Form form={otaForm} layout="vertical">
          <Form.Item name="firmware_version_id" label={t("firmware.version") + " ID"} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="gray_scale_percent" label={t("firmware.grayScale")} initialValue={100}>
            <Select options={[1, 5, 10, 25, 50, 100].map((n) => ({ label: `${n}%`, value: n }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
