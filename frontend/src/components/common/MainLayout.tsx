import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Button,
  Typography,
  Badge,
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
  ThunderboltOutlined,
  BgColorsOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../stores/authStore";
import { useAppStore } from "../../stores/appStore";
import { useLocale } from "../../locales";
import { themePresets } from "../../theme/presets";

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
  const { language, setLanguage, themeId, setTheme } = useAppStore();
  const { t } = useLocale();

  const selectedKey = "/" + location.pathname.split("/")[1];

  const userMenuItems = [
    {
      key: "user-info",
      label: (
        <div style={{ padding: "4px 0" }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{user?.email || user?.role}</div>
        </div>
      ),
      disabled: true,
    },
    { type: "divider" as const },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: t("menu.settings"),
    },
    {
      key: "theme-group",
      icon: <BgColorsOutlined />,
      label: "Theme / 主题",
      children: themePresets.map((preset) => ({
        key: `theme:${preset.id}`,
        label: (
          <Space size={8}>
            <span
              className={`theme-swatch${themeId === preset.id ? " theme-option-active" : ""}`}
              style={{
                background: `linear-gradient(135deg, ${preset.colors.primary[500]}, ${preset.colors.primary[400]})`,
              }}
            />
            <span>{preset.nameZh}</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{preset.name}</span>
            {themeId === preset.id && (
              <CheckOutlined style={{ color: "var(--color-primary)", fontSize: 12, marginLeft: "auto" }} />
            )}
          </Space>
        ),
      })),
    },
    {
      key: "lang",
      icon: <TranslationOutlined />,
      label: language === "zh-CN" ? "Switch to English" : "切换到中文",
    },
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t("auth.logout"),
      danger: true,
    },
  ];

  const handleUserMenu = ({ key }: { key: string }) => {
    if (key.startsWith("theme:")) {
      const id = key.slice(6);
      setTheme(id);
      return;
    }
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
      {/* ── Dark Sidebar ── */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={232}
        collapsedWidth={64}
        style={{
          borderRight: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {/* Brand */}
        <div className="sidebar-brand">
          {collapsed ? (
            <ThunderboltOutlined
              style={{ fontSize: 22, color: "var(--color-primary)" }}
            />
          ) : (
            <Space align="center" size={10}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, var(--color-primary), #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px color-mix(in srgb, var(--color-primary) 40%, transparent)",
                }}
              >
                <ThunderboltOutlined style={{ fontSize: 16, color: "#fff" }} />
              </div>
              <Typography.Text
                strong
                style={{
                  color: "#fff",
                  fontSize: 16,
                  letterSpacing: "-0.3px",
                  whiteSpace: "nowrap",
                }}
              >
                {t("app.brand")}
              </Typography.Text>
            </Space>
          )}
        </div>

        {/* Navigation */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems.map((item) => ({
            ...item,
            label: t(menuLabelKeys[item.key] || item.key),
          }))}
          onClick={({ key }) => navigate(key)}
          style={{
            background: "transparent",
            borderInlineEnd: "none",
            padding: "8px 0",
          }}
        />
      </Sider>

      {/* ── Content Area ── */}
      <Layout>
        {/* Glass Header */}
        <Header
          className="header-glass"
          style={{
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 56,
            lineHeight: "56px",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <Space size={16}>
            <Button
              type="text"
              icon={
                collapsed ? (
                  <MenuUnfoldOutlined style={{ fontSize: 16 }} />
                ) : (
                  <MenuFoldOutlined style={{ fontSize: 16 }} />
                )
              }
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: "#64748b" }}
            />
            <Typography.Text
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "#334155",
                letterSpacing: "-0.2px",
              }}
            >
              {t("app.title")}
            </Typography.Text>
          </Space>

          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenu }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Space
              style={{
                cursor: "pointer",
                padding: "4px 12px 4px 4px",
                borderRadius: 40,
                transition: "background 150ms",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <Badge
                status="success"
                dot
                offset={[-2, 30]}
                style={{ boxShadow: "0 0 0 2px #fff" }}
              >
                <Avatar
                  src={user?.avatar_url}
                  icon={<UserOutlined />}
                  size={32}
                  style={{ backgroundColor: "#4f6ef6" }}
                />
              </Badge>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#334155",
                }}
              >
                {user?.name || "User"}
              </span>
            </Space>
          </Dropdown>
        </Header>

        {/* Page Content */}
        <Content style={{ margin: 24, minHeight: 280 }}>
          <div className="page-enter">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
