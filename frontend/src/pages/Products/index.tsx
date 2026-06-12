import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  ProTable,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "@/components/common/antd-imports";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
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

export default function Products() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, search, statusFilter, typeFilter],
    queryFn: () =>
      productApi.list({
        page,
        page_size: 20,
        search: search || undefined,
        status: statusFilter,
        type: typeFilter,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => productApi.create(values),
    onSuccess: () => {
      message.success("Product created");
      setCreateModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleCreate = () => {
    form.validateFields().then((values) => createMutation.mutate(values));
  };

  const columns = [
    {
      title: "Product Code",
      dataIndex: "code",
      key: "code",
      width: 160,
    },
    {
      title: "Model",
      dataIndex: "model",
      key: "model",
      width: 160,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (v: string) => (
        <Tag>{v === "ac_charger" ? "AC" : v === "dc_charger" ? "DC" : v === "portable" ? "Portable" : v || "-"}</Tag>
      ),
    },
    {
      title: t("common.status"),
      dataIndex: "lifecycle_status",
      key: "lifecycle_status",
      width: 130,
      render: (v: string) => (
        <Tag color={statusColors[v] || "default"}>{t(`product.status.${v}`) || v}</Tag>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={<Typography.Title level={4}>{t("menu.products")}</Typography.Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            {t("common.create")}
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder={t("common.search")}
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            allowClear
            style={{ width: 140 }}
            options={[
              { label: t("product.status.in_development"), value: "in_development" },
              { label: t("product.status.trial_handover"), value: "trial_handover" },
              { label: t("product.status.on_sale"), value: "on_sale" },
              { label: t("product.status.discontinued"), value: "discontinued" },
              { label: t("product.status.eol"), value: "eol" },
            ]}
          />
          <Select
            placeholder="Type"
            value={typeFilter}
            onChange={(v) => { setTypeFilter(v); setPage(1); }}
            allowClear
            style={{ width: 140 }}
            options={[
              { label: "AC Charger", value: "ac_charger" },
              { label: "DC Charger", value: "dc_charger" },
              { label: "Portable", value: "portable" },
            ]}
          />
        </Space>
        <ProTable
          columns={columns}
          dataSource={data?.data?.data || []}
          loading={isLoading}
          rowKey="id"
          search={false}
          options={false}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.data?.total || 0,
            onChange: setPage,
            showTotal: (total: number) => `Total ${total}`,
          }}
          onRow={(record: { id: string }) => ({
            onClick: () => navigate(`/products/${record.id}`),
            style: { cursor: "pointer" },
          })}
        />
      </Card>

      <Modal
        title={`${t("common.create")} Product`}
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => setCreateModalOpen(false)}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical">
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
    </div>
  );
}
