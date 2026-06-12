import { useState } from "react";
import { Card, Table, Tag, Typography, Space, Select, Input, Button, Modal, Form, message, Tabs } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../services/api";
import { useLocale } from "../../locales";

const roleColors: Record<string, string> = {
  admin: "red", pm: "blue", designer: "purple", engineer: "cyan",
  supplier: "orange", cert_specialist: "green", ops: "geekblue",
};

export default function Admin() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Record<string, unknown> | null>(null);
  const [userForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data: usersResp, isLoading: uLoading } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => adminApi.listUsers({ page, page_size: 20, search: search || undefined }),
    enabled: activeTab === "users",
  });

  const { data: auditResp, isLoading: aLoading } = useQuery({
    queryKey: ["admin-audit", auditPage],
    queryFn: () => adminApi.getAuditLogs({ page: auditPage, page_size: 20 }),
    enabled: activeTab === "audit",
  });

  const createUserMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) => adminApi.createUser(v),
    onSuccess: () => { message.success("User created"); setUserModalOpen(false); userForm.resetFields(); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => adminApi.updateUser(id, data),
    onSuccess: () => { message.success("User updated"); setEditUserOpen(false); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  const users = usersResp?.data?.data || [];
  const uTotal = usersResp?.data?.total || 0;
  const auditLogs = auditResp?.data?.data || [];
  const aTotal = auditResp?.data?.total || 0;

  const userColumns = [
    { title: "Name", dataIndex: "name", key: "name", width: 120 },
    { title: "Email", dataIndex: "email", key: "email", width: 180, render: (v: string) => v || "-" },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 120,
      render: (v: string) => <Tag color={roleColors[v]}>{v}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 80,
      render: (v: boolean) => <Tag color={v ? "green" : "red"}>{v ? "Active" : "Inactive"}</Tag>,
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
  ];

  const auditColumns = [
    { title: "Action", dataIndex: "action", key: "action", width: 140 },
    { title: "Resource", dataIndex: "resource_type", key: "resource_type", width: 120 },
    { title: "Resource ID", dataIndex: "resource_id", key: "resource_id", width: 120, ellipsis: true },
    { title: "User", dataIndex: "user_id", key: "user_id", width: 120, ellipsis: true },
    {
      title: "Time",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (v: number | string) => v ? new Date(v).toLocaleString() : "-",
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>{t("menu.admin")}</Typography.Title>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} tabBarExtraContent={
          activeTab === "users"
            ? <Button type="primary" icon={<PlusOutlined />} onClick={() => setUserModalOpen(true)}>Add User</Button>
            : null
        }>
          <Tabs.TabPane tab="Users" key="users">
            <Space style={{ marginBottom: 16 }}>
              <Input prefix={<SearchOutlined />} placeholder="Search name/email" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ width: 240 }} allowClear />
            </Space>
            <Table columns={userColumns} dataSource={users} rowKey="id" loading={uLoading}
              pagination={{ current: page, pageSize: 20, total: uTotal, onChange: setPage }}
              onRow={(r: Record<string, unknown>) => ({ onClick: () => { setSelectedUser(r); editForm.setFieldsValue(r); setEditUserOpen(true); }, style: { cursor: "pointer" } })} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Audit Logs" key="audit">
            <Table columns={auditColumns} dataSource={auditLogs} rowKey="id" loading={aLoading}
              pagination={{ current: auditPage, pageSize: 20, total: aTotal, onChange: setAuditPage }} />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      <Modal title="Add User" open={userModalOpen}
        onOk={() => userForm.validateFields().then((v) => createUserMutation.mutate(v))}
        onCancel={() => { setUserModalOpen(false); userForm.resetFields(); }}
        confirmLoading={createUserMutation.isPending}>
        <Form form={userForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="role" label="Role" initialValue="engineer">
            <Select options={Object.keys(roleColors).map((k) => ({ label: k, value: k }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Edit User" open={editUserOpen}
        onOk={() => editForm.validateFields().then((v) => updateUserMutation.mutate({ id: selectedUser?.id as string, data: v }))}
        onCancel={() => { setEditUserOpen(false); setSelectedUser(null); }}
        confirmLoading={updateUserMutation.isPending}>
        <Form form={editForm} layout="vertical">
          <Form.Item name="role" label="Role">
            <Select options={Object.keys(roleColors).map((k) => ({ label: k, value: k }))} />
          </Form.Item>
          <Form.Item name="is_active" label="Active">
            <Select options={[{ label: "Active", value: true }, { label: "Inactive", value: false }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
