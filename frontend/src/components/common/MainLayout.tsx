import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  theme,
  Button,
  Typography,
} from "antd";
import {
  DashboardOutlined,
  AppstoreOutlined,
  ProjectOutlined,
  FileImageOutlined,
  TeamOutlined,
  NodeIndexOutlined,
  CloudUploadOutlined,
  BarChartOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TranslationOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../stores/authStore";
import { useAppStore } from "../../stores/appStore";
import { useLocale } from "../../locales";

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "" },
  { key: "/products", icon: <AppstoreOutlined />, label: "" },
  { key: "/projects", icon: <ProjectOutlined />, label: "" },
  { key: "/design", icon: <FileImageOutlined />, label: "" },
  { key: "/suppliers", icon: <TeamOutlined />, label: "" },
  { key: "/lifecycle", icon: <NodeIndexOutlined />, label: "" },
  { key: "/firmware", icon: <CloudUploadOutlined />, label: "" },
  { key: "/analytics", icon: <BarChartOutlined />, label: "" },
  { key: "/admin", icon: <SettingOutlined />, label: "" },
  { key: "/certifications", icon: <SafetyCertificateOutlined />, label: "" },
];

const menuLabelKeys: Record<string, string> = {
  "/": "menu.dashboard",
  "/products": "menu.products",
  "/projects": "menu.projects",
  "/design": "menu.design",
  "/suppliers": "menu.suppliers",
  "/lifecycle": "menu.lifecycle",
  "/firmware": "menu.firmware",
  "/analytics": "menu.analytics",
  "/admin": "menu.admin",
  "/certifications": "menu.certifications",
};

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { language, setLanguage } = useAppStore();
  const { t } = useLocale();
  const { token: themeToken } = theme.useToken();

  const selectedKey = "/" + location.pathname.split("/")[1];

  const userMenuItems = [
    { key: "settings", icon: <SettingOutlined />, label: t("menu.settings") },
    { key: "lang", icon: <TranslationOutlined />, label: language === "zh-CN" ? "Switch to English" : "切换到中文" },
    { type: "divider" as const },
    { key: "logout", icon: <LogoutOutlined />, label: t("auth.logout"), danger: true },
  ];

  const handleUserMenu = ({ key }: { key: string }) => {
    switch (key) {
      case "settings":
        navigate("/settings");
        break;
      case "lang":
        setLanguage(language === "zh-CN" ? "en-US" : "zh-CN");
        break;
      case "logout":
        logout();
        navigate("/login");
        break;
    }
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={220}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 16px",
          }}
        >
          <Typography.Text
            strong
            style={{ color: "#fff", fontSize: collapsed ? 14 : 16, whiteSpace: "nowrap" }}
          >
            {collapsed ? "PDM" : t("app.brand")}
          </Typography.Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems.map((item) => ({
            ...item,
            label: t(menuLabelKeys[item.key] || item.key),
          }))}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: themeToken.colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <Typography.Title level={5} style={{ margin: 0 }}>
              {t("app.title")}
            </Typography.Title>
          </Space>
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }}>
            <Space style={{ cursor: "pointer" }}>
              <Avatar src={user?.avatar_url} icon={<UserOutlined />} />
              <span>{user?.name || "User"}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
