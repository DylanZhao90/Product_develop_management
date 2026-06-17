import { Card, Descriptions, Form, Select, Typography, Avatar, Tag, Divider } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useAppStore } from "../../stores/appStore";
import { useAuthStore } from "../../stores/authStore";
import { useLocale } from "../../locales";

const roleColors: Record<string, string> = {
  admin: "red", pm: "blue", designer: "purple", engineer: "cyan",
  supplier: "orange", cert_specialist: "green", ops: "geekblue",
};

const roleNames: Record<string, Record<string, string>> = {
  "zh-CN": { admin: "管理员", pm: "项目经理", designer: "设计师", engineer: "工程师", supplier: "供应商", cert_specialist: "认证专员", ops: "运维" },
  "en-US": { admin: "Admin", pm: "PM", designer: "Designer", engineer: "Engineer", supplier: "Supplier", cert_specialist: "Cert Specialist", ops: "Ops" },
};

export default function Settings() {
  const { language, setLanguage } = useAppStore();
  const { user } = useAuthStore();
  const { t, lang } = useLocale();

  return (
    <div>
      <div className="page-header">
        <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
          {t("menu.settings")}
        </Typography.Title>
        <Typography.Text className="page-header-desc">
          {t("common.profile")}
        </Typography.Text>
      </div>

      <Card title={t("common.profile")} style={{ maxWidth: 700, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          <Avatar size={72} src={user?.avatar_url} icon={<UserOutlined />} />
          <div style={{ marginLeft: 20 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>{user?.name || t("common.profile")}</Typography.Title>
            <Tag color={roleColors[user?.role || "engineer"]}>
              {(roleNames[lang] || roleNames["zh-CN"])[user?.role || "engineer"]}
            </Tag>
          </div>
        </div>
        <Descriptions column={1} bordered size="small" items={[
          { label: t("common.userId"), children: user?.id || "-" },
          { label: t("admin.email"), children: user?.email || "-" },
          { label: t("admin.role"), children: (roleNames[lang] || roleNames["zh-CN"])[user?.role || "engineer"] },
          { label: t("common.language"), children: lang === "zh-CN" ? "中文" : "English" },
        ]} />
      </Card>

      <Card title={t("common.preferences")} style={{ maxWidth: 700 }}>
        <Form layout="vertical">
          <Form.Item label={t("common.language")}>
            <Select value={language} onChange={(v) => setLanguage(v)} style={{ width: 200 }}
              options={[{ label: "中文", value: "zh-CN" }, { label: "English", value: "en-US" }]} />
          </Form.Item>
        </Form>
        <Divider />
        <Typography.Paragraph type="secondary">
          PDM · Product Development Management
          <br />
          Version {__APP_VERSION__}
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
