import { useNavigate } from "react-router-dom";
import { Button, Card, Divider, Space, Typography } from "antd";
import {
  SafetyOutlined,
  GlobalOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../stores/authStore";
import { useLocale } from "../../locales";
import Logo from "../../components/common/Logo";

export default function Login() {
  const { login, enableDemo } = useAuthStore();
  const { t } = useLocale();
  const navigate = useNavigate();

  const handleDemo = () => {
    enableDemo();
    navigate("/", { replace: true });
  };

  return (
    <div className="login-page">
      {/* Decorative grid lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      <Card className="login-card" styles={{ body: { padding: "48px 40px" } }}>
        <Space direction="vertical" size={28} style={{ width: "100%" }}>
          {/* Brand Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
            <Logo iconSize={48} showText={false} variant="login" />
          </div>

          {/* Title */}
          <div>
            <Typography.Title
              level={2}
              style={{
                margin: 0,
                fontWeight: 700,
                letterSpacing: "-0.5px",
                fontSize: 26,
              }}
            >
              安纳瑞 PDM
            </Typography.Title>
            <Typography.Text
              style={{
                fontSize: 14,
                color: "#64748b",
                marginTop: 8,
                display: "block",
              }}
            >
              {t("auth.loginHint")}
            </Typography.Text>
          </div>

          {/* Login Button */}
          <Button
            type="primary"
            size="large"
            block
            onClick={login}
            className="login-btn-gradient"
            style={{
              height: 48,
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 12,
              letterSpacing: "-0.2px",
            }}
          >
            {t("auth.login")}
          </Button>

          {/* Demo mode */}
          <Divider plain style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            {t("auth.backendNotRunning")}
          </Divider>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={handleDemo}
            style={{ color: "#64748b", fontSize: 13 }}
          >
            {t("auth.demoPreview")}
          </Button>

          {/* Features row */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 32,
              paddingTop: 8,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            {[
              {
                icon: (
                  <SafetyOutlined style={{ fontSize: 14, color: "#4f6ef6" }} />
                ),
                label: t("auth.login"),
              },
              {
                icon: (
                  <GlobalOutlined style={{ fontSize: 14, color: "#4f6ef6" }} />
                ),
                label: "TLS 1.3",
              },
            ].map((item, i) => (
              <Space key={i} size={6}>
                {item.icon}
                <Typography.Text
                  style={{ fontSize: 12, color: "#94a3b8" }}
                >
                  {item.label}
                </Typography.Text>
              </Space>
            ))}
          </div>
        </Space>
      </Card>

      {/* Footer text */}
      <Typography.Text
        style={{
          position: "absolute",
          bottom: 32,
          color: "rgba(255,255,255,0.25)",
          fontSize: 12,
        }}
      >
        © 2026 PDM · Product Development Management
      </Typography.Text>
    </div>
  );
}
