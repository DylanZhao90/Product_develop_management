import { Button, Card, Space, Typography } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import { useAuthStore } from "../../stores/authStore";
import { useLocale } from "../../locales";

export default function Login() {
  const { login } = useAuthStore();
  const { t } = useLocale();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Card style={{ width: 400, textAlign: "center", borderRadius: 12 }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <ThunderboltOutlined style={{ fontSize: 64, color: "#1677ff" }} />
          <Typography.Title level={3}>{t("app.brand")}</Typography.Title>
          <Typography.Text type="secondary">{t("auth.loginHint")}</Typography.Text>
          <Button
            type="primary"
            size="large"
            block
            onClick={login}
            style={{ height: 48, fontSize: 16 }}
          >
            {t("auth.login")}
          </Button>
        </Space>
      </Card>
    </div>
  );
}
