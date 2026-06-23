import { useState, useEffect, useCallback } from "react";
import {
  Card, Table, Tag, Typography, Space, Select, Input, Button, Modal, Form, message, Tabs,
  Collapse, Switch, InputNumber, Divider, Upload,
} from "antd";
import { PlusOutlined, SearchOutlined, SaveOutlined, UndoOutlined, DeleteOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../services/api";
import { useLocale } from "../../locales";
import { useAppStore } from "../../stores/appStore";
import { themePresets } from "../../theme/presets";
import type { User } from "../../services/api-types";

const roleColors: Record<string, string> = {
  admin: "red", pm: "blue", designer: "purple", engineer: "cyan",
  supplier: "orange", cert_specialist: "green", ops: "geekblue",
};

const STORAGE_KEY = "pdm_system_settings";

// ---- Default settings ----
const DEFAULT_SETTINGS: Record<string, unknown> = {
  brandName: "An Energy PDM",
  brandLogoSrc: "",
  companyName: "",
  icp: "",
  feishuWebhook: "",
  emailNotify: true,
  notifyTemplate: "{{user}} 提交了 {{type}} 审批，请及时处理。",
  pwdMinLen: 8,
  pwdComplexity: "medium",
  sessionTimeout: 480,
  lockThreshold: 5,
  featureLifecycle: true,
  featureAutoRemind: true,
  featureVersionMgmt: true,
  featureSupplierReview: true,
  integrationFeishuBot: "",
  integrationFeishuAppId: "",
  integrationFeishuAppSecret: "",
};

function loadSettings(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

// ---- Profile defaults ----
const STORAGE_KEY_PROFILE = "pdm_config_profile";
const PROFILE_DEFAULTS: Record<string, unknown> = {
  name: "",
  email: "",
  avatarUrl: "",
  language: "zh-CN",
  themeId: "vercel-light",
};

function loadProfile(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (raw) {
      return { ...PROFILE_DEFAULTS, ...JSON.parse(raw) };
    }
  } catch { /* ignore */ }
  return { ...PROFILE_DEFAULTS };
}

// ---- Product config defaults ----
const STORAGE_KEY_PRODUCT = "pdm_config_product";
const PRODUCT_CONFIG_DEFAULTS: Record<string, unknown> = {
  productTypes: [
    { value: "ac_charger", label: "AC充电桩", color: "blue" },
    { value: "dc_charger", label: "DC充电桩", color: "green" },
    { value: "portable", label: "便携式充电桩", color: "purple" },
  ],
  lifecycleStages: [
    { value: "in_development", label: "开发中", color: "blue" },
    { value: "trial_handover", label: "试产移交", color: "orange" },
    { value: "on_sale", label: "已上市", color: "green" },
    { value: "discontinued", label: "已停产", color: "red" },
    { value: "eol", label: "停售", color: "default" },
  ],
  lifecycleTransitions: {
    in_development: { trial_handover: 30 },
    trial_handover: { on_sale: 60, in_development: 7 },
    on_sale: { discontinued: 365 },
    discontinued: { eol: 180 },
  },
};

function loadProductConfig(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCT);
    if (raw) {
      return { ...PRODUCT_CONFIG_DEFAULTS, ...JSON.parse(raw) };
    }
  } catch { /* ignore */ }
  return JSON.parse(JSON.stringify(PRODUCT_CONFIG_DEFAULTS));
}

// ---- Project config defaults ----
const STORAGE_KEY_PROJECT = "pdm_config_project";
const PROJECT_CONFIG_DEFAULTS: Record<string, unknown> = {
  taskStatuses: [
    { value: "pending", label: "待处理", color: "default" },
    { value: "in_progress", label: "进行中", color: "processing" },
    { value: "completed", label: "已完成", color: "green" },
    { value: "blocked", label: "已阻塞", color: "red" },
  ],
  issueSeverities: [
    { value: "critical", label: "严重", color: "red" },
    { value: "major", label: "主要", color: "orange" },
    { value: "minor", label: "次要", color: "blue" },
  ],
  projectStages: [
    { value: "requirements", label: "需求分析" },
    { value: "design", label: "设计" },
    { value: "development", label: "开发" },
    { value: "testing", label: "测试" },
    { value: "acceptance", label: "验收" },
    { value: "maintenance", label: "维护" },
  ],
};

function loadProjectConfig(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECT);
    if (raw) {
      return { ...PROJECT_CONFIG_DEFAULTS, ...JSON.parse(raw) };
    }
  } catch { /* ignore */ }
  return JSON.parse(JSON.stringify(PROJECT_CONFIG_DEFAULTS));
}

// ---- Supplier config defaults ----
const STORAGE_KEY_SUPPLIER = "pdm_config_supplier";
const SUPPLIER_CONFIG_DEFAULTS: Record<string, unknown> = {
  supplierTypes: [
    { value: "design", label: "设计供应商" },
    { value: "module_dev", label: "模组开发供应商" },
  ],
  supplierRatings: [
    { value: "A", label: "A级", description: "优秀供应商" },
    { value: "B", label: "B级", description: "良好供应商" },
    { value: "C", label: "C级", description: "合格供应商" },
    { value: "D", label: "D级", description: "不合格供应商" },
  ],
};

function loadSupplierConfig(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUPPLIER);
    if (raw) {
      return { ...SUPPLIER_CONFIG_DEFAULTS, ...JSON.parse(raw) };
    }
  } catch { /* ignore */ }
  return JSON.parse(JSON.stringify(SUPPLIER_CONFIG_DEFAULTS));
}

// ---- Component ----

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

  // ---- Settings forms ----
  const [brandForm] = Form.useForm();
  const [notifyForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [featuresForm] = Form.useForm();
  const [integrationForm] = Form.useForm();
  const [settings, setSettings] = useState<Record<string, unknown>>(loadSettings);

  // ---- Profile state ----
  const [profileForm] = Form.useForm();
  const [profile, setProfile] = useState<Record<string, unknown>>(loadProfile);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setTheme = useAppStore((s) => s.setTheme);

  // ---- Product config state ----
  const [productForm] = Form.useForm();
  const [productConfig, setProductConfig] = useState<Record<string, unknown>>(loadProductConfig);

  // ---- Project config state ----
  const [projectForm] = Form.useForm();
  const [projectConfig, setProjectConfig] = useState<Record<string, unknown>>(loadProjectConfig);

  // ---- Supplier config state ----
  const [supplierForm] = Form.useForm();
  const [supplierConfig, setSupplierConfig] = useState<Record<string, unknown>>(loadSupplierConfig);

  // ---- Dynamic list helpers (product types) ----
  const [productTypes, setProductTypes] = useState<Array<Record<string, string>>>(
    (loadProductConfig().productTypes as Array<Record<string, string>>) || []
  );
  const [lifecycleStages, setLifecycleStages] = useState<Array<Record<string, string>>>(
    (loadProductConfig().lifecycleStages as Array<Record<string, string>>) || []
  );

  // ---- Dynamic list helpers (task statuses) ----
  const [taskStatuses, setTaskStatuses] = useState<Array<Record<string, string>>>(
    (loadProjectConfig().taskStatuses as Array<Record<string, string>>) || []
  );
  const [issueSeverities, setIssueSeverities] = useState<Array<Record<string, string>>>(
    (loadProjectConfig().issueSeverities as Array<Record<string, string>>) || []
  );
  const [projectStages, setProjectStages] = useState<Array<Record<string, string>>>(
    (loadProjectConfig().projectStages as Array<Record<string, string>>) || []
  );

  // ---- Dynamic list helpers (supplier) ----
  const [supplierTypes, setSupplierTypes] = useState<Array<Record<string, string>>>(
    (loadSupplierConfig().supplierTypes as Array<Record<string, string>>) || []
  );
  const [supplierRatings, setSupplierRatings] = useState<Array<Record<string, string>>>(
    (loadSupplierConfig().supplierRatings as Array<Record<string, string>>) || []
  );

  useEffect(() => {
    brandForm.setFieldsValue(settings);
    notifyForm.setFieldsValue(settings);
    securityForm.setFieldsValue(settings);
    featuresForm.setFieldsValue(settings);
    integrationForm.setFieldsValue(settings);
  }, [settings, brandForm, notifyForm, securityForm, featuresForm, integrationForm]);

  useEffect(() => {
    profileForm.setFieldsValue(profile);
  }, [profile, profileForm]);

  useEffect(() => {
    productForm.setFieldsValue(productConfig);
    setProductTypes((productConfig.productTypes as Array<Record<string, string>>) || []);
    setLifecycleStages((productConfig.lifecycleStages as Array<Record<string, string>>) || []);
  }, [productConfig, productForm]);

  useEffect(() => {
    projectForm.setFieldsValue(projectConfig);
    setTaskStatuses((projectConfig.taskStatuses as Array<Record<string, string>>) || []);
    setIssueSeverities((projectConfig.issueSeverities as Array<Record<string, string>>) || []);
    setProjectStages((projectConfig.projectStages as Array<Record<string, string>>) || []);
  }, [projectConfig, projectForm]);

  useEffect(() => {
    supplierForm.setFieldsValue(supplierConfig);
    setSupplierTypes((supplierConfig.supplierTypes as Array<Record<string, string>>) || []);
    setSupplierRatings((supplierConfig.supplierRatings as Array<Record<string, string>>) || []);
  }, [supplierConfig, supplierForm]);

  // ---- Settings save handlers ----
  const handleSaveBrand = useCallback((values: Record<string, unknown>) => {
    const next = { ...settings, ...values };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("brand-logo-changed"));
    message.success(t("admin.settings.saved"));
  }, [settings]);

  const handleSaveNotify = useCallback((values: Record<string, unknown>) => {
    const next = { ...settings, ...values };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    message.success(t("admin.settings.saved"));
  }, [settings]);

  const handleSaveSecurity = useCallback((values: Record<string, unknown>) => {
    const next = { ...settings, ...values };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    message.success(t("admin.settings.saved"));
  }, [settings]);

  const handleSaveFeatures = useCallback((values: Record<string, unknown>) => {
    const next = { ...settings, ...values };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    message.success(t("admin.settings.saved"));
  }, [settings]);

  const handleSaveIntegration = useCallback((values: Record<string, unknown>) => {
    const next = { ...settings, ...values };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    message.success(t("admin.settings.saved"));
  }, [settings]);

  const handleResetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    window.dispatchEvent(new CustomEvent("brand-logo-changed"));
    message.success(t("admin.settings.saved"));
  }, []);

  // ---- Profile handlers ----
  const handleSaveProfile = useCallback((values: Record<string, unknown>) => {
    const next = { ...profile, ...values };
    setProfile(next);
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(next));
    // Sync to app store
    if (values.language) setLanguage(values.language as "zh-CN" | "en-US");
    if (values.themeId) setTheme(values.themeId as string);
    message.success("个人资料保存成功");
  }, [profile, setLanguage, setTheme]);

  const handleResetProfile = useCallback(() => {
    const defaults = { ...PROFILE_DEFAULTS };
    setProfile(defaults);
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(defaults));
    message.success("个人资料已重置");
  }, []);

  // ---- Product config handlers ----
  const handleSaveProduct = useCallback((values: Record<string, unknown>) => {
    const next = { ...productConfig, ...values, productTypes, lifecycleStages };
    setProductConfig(next);
    localStorage.setItem(STORAGE_KEY_PRODUCT, JSON.stringify(next));
    message.success("产品配置保存成功");
  }, [productConfig, productTypes, lifecycleStages]);

  const handleResetProduct = useCallback(() => {
    const defaults = JSON.parse(JSON.stringify(PRODUCT_CONFIG_DEFAULTS));
    setProductConfig(defaults);
    localStorage.setItem(STORAGE_KEY_PRODUCT, JSON.stringify(defaults));
    message.success("产品配置已重置");
  }, []);

  // ---- Project config handlers ----
  const handleSaveProject = useCallback((values: Record<string, unknown>) => {
    const next = { ...projectConfig, ...values, taskStatuses, issueSeverities, projectStages };
    setProjectConfig(next);
    localStorage.setItem(STORAGE_KEY_PROJECT, JSON.stringify(next));
    message.success("项目配置保存成功");
  }, [projectConfig, taskStatuses, issueSeverities, projectStages]);

  const handleResetProject = useCallback(() => {
    const defaults = JSON.parse(JSON.stringify(PROJECT_CONFIG_DEFAULTS));
    setProjectConfig(defaults);
    localStorage.setItem(STORAGE_KEY_PROJECT, JSON.stringify(defaults));
    message.success("项目配置已重置");
  }, []);

  // ---- Supplier config handlers ----
  const handleSaveSupplier = useCallback((values: Record<string, unknown>) => {
    const next = { ...supplierConfig, ...values, supplierTypes, supplierRatings };
    setSupplierConfig(next);
    localStorage.setItem(STORAGE_KEY_SUPPLIER, JSON.stringify(next));
    message.success("供应商配置保存成功");
  }, [supplierConfig, supplierTypes, supplierRatings]);

  const handleResetSupplier = useCallback(() => {
    const defaults = JSON.parse(JSON.stringify(SUPPLIER_CONFIG_DEFAULTS));
    setSupplierConfig(defaults);
    localStorage.setItem(STORAGE_KEY_SUPPLIER, JSON.stringify(defaults));
    message.success("供应商配置已重置");
  }, []);

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
    onSuccess: () => { message.success(t("admin.userCreated")); setUserModalOpen(false); userForm.resetFields(); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => adminApi.updateUser(id, data),
    onSuccess: () => { message.success(t("admin.userUpdated")); setEditUserOpen(false); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  const rawUsers = usersResp?.data?.data || [];
  const users = rawUsers as unknown as Record<string, unknown>[];
  const uTotal = usersResp?.data?.total || 0;
  const rawAuditLogs = auditResp?.data?.data || [];
  const auditLogs = rawAuditLogs as unknown as Record<string, unknown>[];
  const aTotal = auditResp?.data?.total || 0;

  const userColumns = [
    { title: t("admin.name"), dataIndex: "name", key: "name", width: 120 },
    { title: t("admin.email"), dataIndex: "email", key: "email", width: 180, render: (v: string) => v || "-" },
    {
      title: t("admin.role"),
      dataIndex: "role",
      key: "role",
      width: 120,
      render: (v: string) => <Tag color={roleColors[v]}>{v}</Tag>,
    },
    {
      title: t("admin.status"),
      dataIndex: "is_active",
      key: "is_active",
      width: 80,
      render: (v: boolean) => <Tag color={v ? "green" : "red"}>{v ? t("common.active") : t("common.inactive")}</Tag>,
    },
    {
      title: t("admin.created"),
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
  ];

  const auditColumns = [
    { title: t("admin.action"), dataIndex: "action", key: "action", width: 140 },
    { title: t("admin.resource"), dataIndex: "resource_type", key: "resource_type", width: 120 },
    { title: t("admin.resourceId"), dataIndex: "resource_id", key: "resource_id", width: 120, ellipsis: true },
    { title: t("common.auditUser"), dataIndex: "user_id", key: "user_id", width: 120, ellipsis: true },
    {
      title: t("common.time"),
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (v: number | string) => v ? new Date(v).toLocaleString() : "-",
    },
  ];

  // ---- Settings sections ----
  const settingsSections = [
    {
      key: "brand",
      label: t("admin.settings.brand"),
      form: brandForm,
      onFinish: handleSaveBrand,
      fields: (
        <>
          <Form.Item name="brandName" label={t("admin.settings.brandName")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="brandLogoSrc" label={t("admin.settings.brandLogoSrc")}>
            <Upload
              listType="picture-card"
              showUploadList={false}
              accept="image/png,image/jpeg,image/svg+xml"
              beforeUpload={(file) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  brandForm.setFieldValue("brandLogoSrc", e.target?.result as string);
                  message.success("Logo 图片已加载，点击保存按钮后生效");
                };
                reader.readAsDataURL(file);
                return false;
              }}
            >
              {brandForm.getFieldValue("brandLogoSrc") ? (
                <img
                  src={brandForm.getFieldValue("brandLogoSrc")}
                  alt="brand-logo"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <button style={{ border: 0, background: "none" }} type="button">
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传Logo</div>
                </button>
              )}
            </Upload>
          </Form.Item>
          <Form.Item name="companyName" label={t("admin.settings.companyName")}>
            <Input />
          </Form.Item>
          <Form.Item name="icp" label={t("admin.settings.icp")}>
            <Input placeholder="沪ICP备XXXXXXXX号" />
          </Form.Item>
        </>
      ),
    },
    {
      key: "notification",
      label: t("admin.settings.notification"),
      form: notifyForm,
      onFinish: handleSaveNotify,
      fields: (
        <>
          <Form.Item name="feishuWebhook" label={t("admin.settings.feishuWebhook")}>
            <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." />
          </Form.Item>
          <Form.Item name="emailNotify" label={t("admin.settings.emailNotify")} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="notifyTemplate" label={t("admin.settings.notifyTemplate")}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </>
      ),
    },
    {
      key: "security",
      label: t("admin.settings.security"),
      form: securityForm,
      onFinish: handleSaveSecurity,
      fields: (
        <>
          <Form.Item name="pwdMinLen" label={t("admin.settings.pwdMinLen")} rules={[{ required: true }]}>
            <InputNumber min={4} max={64} />
          </Form.Item>
          <Form.Item name="pwdComplexity" label={t("admin.settings.pwdComplexity")}>
            <Select
              options={[
                { label: t("admin.settings.pwdComplexityOptions.low"), value: "low" },
                { label: t("admin.settings.pwdComplexityOptions.medium"), value: "medium" },
                { label: t("admin.settings.pwdComplexityOptions.high"), value: "high" },
              ]}
            />
          </Form.Item>
          <Form.Item name="sessionTimeout" label={t("admin.settings.sessionTimeout")} rules={[{ required: true }]}>
            <InputNumber min={5} max={1440} />
          </Form.Item>
          <Form.Item name="lockThreshold" label={t("admin.settings.lockThreshold")} rules={[{ required: true }]}>
            <InputNumber min={1} max={20} />
          </Form.Item>
        </>
      ),
    },
    {
      key: "features",
      label: t("admin.settings.features"),
      form: featuresForm,
      onFinish: handleSaveFeatures,
      fields: (
        <>
          <Form.Item name="featureLifecycle" label={t("admin.settings.featureLifecycle")} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="featureAutoRemind" label={t("admin.settings.featureAutoRemind")} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="featureVersionMgmt" label={t("admin.settings.featureVersionMgmt")} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="featureSupplierReview" label={t("admin.settings.featureSupplierReview")} valuePropName="checked">
            <Switch />
          </Form.Item>
        </>
      ),
    },
    {
      key: "integration",
      label: t("admin.settings.integration"),
      form: integrationForm,
      onFinish: handleSaveIntegration,
      fields: (
        <>
          <Form.Item name="integrationFeishuBot" label={t("admin.settings.integrationFeishuBot")}>
            <Input.Password placeholder="bot token" />
          </Form.Item>
          <Form.Item name="integrationFeishuAppId" label={t("admin.settings.integrationFeishuAppId")}>
            <Input placeholder="cli_xxxxxxxxxx" />
          </Form.Item>
          <Form.Item name="integrationFeishuAppSecret" label={t("admin.settings.integrationFeishuAppSecret")}>
            <Input.Password placeholder="app secret" />
          </Form.Item>
        </>
      ),
    },
  ];

  const themeOptions = themePresets.map((p) => ({
    label: `${p.nameZh} (${p.name})`,
    value: p.id,
  }));

  const languageOptions = [
    { label: "中文", value: "zh-CN" },
    { label: "English", value: "en-US" },
  ];

  // ---- Dynamic list helpers ----

  const addProductType = () => {
    setProductTypes((prev) => [...prev, { value: "", label: "", color: "default" }]);
  };

  const updateProductType = (index: number, field: string, val: string) => {
    setProductTypes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const removeProductType = (index: number) => {
    setProductTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const addLifecycleStage = () => {
    setLifecycleStages((prev) => [...prev, { value: "", label: "", color: "default" }]);
  };

  const updateLifecycleStage = (index: number, field: string, val: string) => {
    setLifecycleStages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const removeLifecycleStage = (index: number) => {
    setLifecycleStages((prev) => prev.filter((_, i) => i !== index));
  };

  const moveLifecycleStage = (index: number, direction: "up" | "down") => {
    setLifecycleStages((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addTaskStatus = () => {
    setTaskStatuses((prev) => [...prev, { value: "", label: "", color: "default" }]);
  };

  const updateTaskStatus = (index: number, field: string, val: string) => {
    setTaskStatuses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const removeTaskStatus = (index: number) => {
    setTaskStatuses((prev) => prev.filter((_, i) => i !== index));
  };

  const addIssueSeverity = () => {
    setIssueSeverities((prev) => [...prev, { value: "", label: "", color: "default" }]);
  };

  const updateIssueSeverity = (index: number, field: string, val: string) => {
    setIssueSeverities((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const removeIssueSeverity = (index: number) => {
    setIssueSeverities((prev) => prev.filter((_, i) => i !== index));
  };

  const addProjectStage = () => {
    setProjectStages((prev) => [...prev, { value: "", label: "" }]);
  };

  const updateProjectStage = (index: number, field: string, val: string) => {
    setProjectStages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const removeProjectStage = (index: number) => {
    setProjectStages((prev) => prev.filter((_, i) => i !== index));
  };

  const addSupplierType = () => {
    setSupplierTypes((prev) => [...prev, { value: "", label: "" }]);
  };

  const updateSupplierType = (index: number, field: string, val: string) => {
    setSupplierTypes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const removeSupplierType = (index: number) => {
    setSupplierTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const addSupplierRating = () => {
    setSupplierRatings((prev) => [...prev, { value: "", label: "", description: "" }]);
  };

  const updateSupplierRating = (index: number, field: string, val: string) => {
    setSupplierRatings((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const removeSupplierRating = (index: number) => {
    setSupplierRatings((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="page-header">
        <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
          {t("menu.admin")}
        </Typography.Title>
        <Typography.Text className="page-header-desc">
          {activeTab === "users" ? t("common.total", { count: uTotal }) :
           activeTab === "audit" ? t("common.total", { count: aTotal }) : ""}
        </Typography.Text>
      </div>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} tabBarExtraContent={
          activeTab === "users"
            ? <Button type="primary" icon={<PlusOutlined />} onClick={() => setUserModalOpen(true)}>{t("admin.addUser")}</Button>
            : activeTab === "settings"
            ? <Button icon={<UndoOutlined />} onClick={handleResetSettings}>{t("admin.settings.reset")}</Button>
            : activeTab === "profile"
            ? <Button icon={<UndoOutlined />} onClick={handleResetProfile}>恢复默认</Button>
            : activeTab === "product-config"
            ? <Button icon={<UndoOutlined />} onClick={handleResetProduct}>恢复默认</Button>
            : activeTab === "project-config"
            ? <Button icon={<UndoOutlined />} onClick={handleResetProject}>恢复默认</Button>
            : activeTab === "supplier-config"
            ? <Button icon={<UndoOutlined />} onClick={handleResetSupplier}>恢复默认</Button>
            : null
        }>
          <Tabs.TabPane tab={t("admin.users")} key="users">
            <Space style={{ marginBottom: 16 }}>
              <Input prefix={<SearchOutlined />} placeholder={t("common.search")} value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ width: 240 }} allowClear />
            </Space>
            <Table columns={userColumns} dataSource={users} rowKey="id" loading={uLoading}
              pagination={{ current: page, pageSize: 20, total: uTotal, onChange: setPage }}
              onRow={(r: Record<string, unknown>) => ({ onClick: () => { setSelectedUser(r); editForm.setFieldsValue(r); setEditUserOpen(true); }, style: { cursor: "pointer" } })} />
          </Tabs.TabPane>
          <Tabs.TabPane tab={t("admin.auditLogs")} key="audit">
            <Table columns={auditColumns} dataSource={auditLogs} rowKey="id" loading={aLoading}
              pagination={{ current: auditPage, pageSize: 20, total: aTotal, onChange: setAuditPage }} />
          </Tabs.TabPane>
          <Tabs.TabPane tab={t("admin.settings")} key="settings">
            <Collapse
              defaultActiveKey={["brand"]}
              items={settingsSections.map((sec) => ({
                key: sec.key,
                label: sec.label,
                children: (
                  <Form
                    form={sec.form}
                    layout="vertical"
                    onFinish={sec.onFinish}
                    initialValues={settings}
                  >
                    {sec.fields}
                    <Form.Item>
                      <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                        {t("common.save")}
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              }))}
            />
          </Tabs.TabPane>

          {/* ---- 个人资料 Tab ---- */}
          <Tabs.TabPane tab="个人资料" key="profile">
            <Card title="个人信息" style={{ maxWidth: 640 }}>
              <Form
                form={profileForm}
                layout="vertical"
                onFinish={handleSaveProfile}
                initialValues={profile}
              >
                <Form.Item name="name" label="姓名">
                  <Input placeholder="请输入姓名" />
                </Form.Item>
                <Form.Item name="email" label="邮箱" rules={[{ type: "email", message: "请输入有效的邮箱地址" }]}>
                  <Input placeholder="请输入邮箱" />
                </Form.Item>
                <Form.Item name="avatarUrl" label="头像 URL">
                  <Input placeholder="https://example.com/avatar.png" />
                </Form.Item>
                <Form.Item name="language" label="语言">
                  <Select options={languageOptions} />
                </Form.Item>
                <Form.Item name="themeId" label="主题">
                  <Select options={themeOptions} />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>保存</Button>
                    <Button icon={<UndoOutlined />} onClick={handleResetProfile}>恢复默认</Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </Tabs.TabPane>

          {/* ---- 产品配置 Tab ---- */}
          <Tabs.TabPane tab="产品配置" key="product-config">
            <Form
              form={productForm}
              layout="vertical"
              onFinish={handleSaveProduct}
              initialValues={productConfig}
              style={{ maxWidth: 720 }}
            >
              {/* 产品类型 */}
              <Card title="产品类型" style={{ marginBottom: 16 }}>
                {productTypes.map((pt, idx) => (
                  <Space key={idx} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                    <Input
                      placeholder="枚举值 (如 ac_charger)"
                      value={pt.value}
                      onChange={(e) => updateProductType(idx, "value", e.target.value)}
                      style={{ width: 180 }}
                    />
                    <Input
                      placeholder="中文名称"
                      value={pt.label}
                      onChange={(e) => updateProductType(idx, "label", e.target.value)}
                      style={{ width: 140 }}
                    />
                    <Select
                      value={pt.color}
                      onChange={(v) => updateProductType(idx, "color", v)}
                      style={{ width: 120 }}
                      options={[
                        { label: "默认", value: "default" },
                        { label: "蓝色", value: "blue" },
                        { label: "绿色", value: "green" },
                        { label: "红色", value: "red" },
                        { label: "橙色", value: "orange" },
                        { label: "紫色", value: "purple" },
                        { label: "青色", value: "cyan" },
                      ]}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeProductType(idx)}
                    />
                  </Space>
                ))}
                <Button type="dashed" onClick={addProductType} icon={<PlusOutlined />} block>
                  添加产品类型
                </Button>
              </Card>

              {/* 生命周期阶段 */}
              <Card title="生命周期阶段" style={{ marginBottom: 16 }}>
                {lifecycleStages.map((ls, idx) => (
                  <Space key={idx} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                    <Button
                      size="small"
                      disabled={idx === 0}
                      onClick={() => moveLifecycleStage(idx, "up")}
                    >↑</Button>
                    <Button
                      size="small"
                      disabled={idx === lifecycleStages.length - 1}
                      onClick={() => moveLifecycleStage(idx, "down")}
                    >↓</Button>
                    <Input
                      placeholder="枚举值 (如 in_development)"
                      value={ls.value}
                      onChange={(e) => updateLifecycleStage(idx, "value", e.target.value)}
                      style={{ width: 180 }}
                    />
                    <Input
                      placeholder="中文名称"
                      value={ls.label}
                      onChange={(e) => updateLifecycleStage(idx, "label", e.target.value)}
                      style={{ width: 140 }}
                    />
                    <Select
                      value={ls.color}
                      onChange={(v) => updateLifecycleStage(idx, "color", v)}
                      style={{ width: 120 }}
                      options={[
                        { label: "默认", value: "default" },
                        { label: "蓝色", value: "blue" },
                        { label: "绿色", value: "green" },
                        { label: "红色", value: "red" },
                        { label: "橙色", value: "orange" },
                        { label: "紫色", value: "purple" },
                        { label: "青色", value: "cyan" },
                      ]}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeLifecycleStage(idx)}
                    />
                  </Space>
                ))}
                <Button type="dashed" onClick={addLifecycleStage} icon={<PlusOutlined />} block>
                  添加生命周期阶段
                </Button>
              </Card>

              {/* 生命周期流转天数 */}
              <Card title="生命周期流转规则（默认天数）" style={{ marginBottom: 16 }}>
                {(() => {
                  const transitions = (productForm.getFieldValue("lifecycleTransitions") ||
                    PRODUCT_CONFIG_DEFAULTS.lifecycleTransitions) as Record<string, Record<string, number>>;
                  const stageValues = lifecycleStages.map((s) => s.value).filter(Boolean);
                  return stageValues.flatMap((from) => {
                    const tos = Object.keys(transitions[from] || {});
                    return tos.map((to, i) => (
                      <Space key={`${from}-${to}`} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                        <Tag color="blue">{from}</Tag>
                        <span>→</span>
                        <Tag color="green">{to}</Tag>
                        <Form.Item
                          name={["lifecycleTransitions", from, to]}
                          label="默认天数"
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber min={0} style={{ width: 100 }} />
                        </Form.Item>
                      </Space>
                    ));
                  });
                })()}
              </Card>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>保存</Button>
                  <Button icon={<UndoOutlined />} onClick={handleResetProduct}>恢复默认</Button>
                </Space>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          {/* ---- 项目配置 Tab ---- */}
          <Tabs.TabPane tab="项目配置" key="project-config">
            <Form
              form={projectForm}
              layout="vertical"
              onFinish={handleSaveProject}
              initialValues={projectConfig}
              style={{ maxWidth: 720 }}
            >
              {/* 任务状态 */}
              <Card title="任务状态" style={{ marginBottom: 16 }}>
                {taskStatuses.map((ts, idx) => (
                  <Space key={idx} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                    <Input
                      placeholder="枚举值 (如 pending)"
                      value={ts.value}
                      onChange={(e) => updateTaskStatus(idx, "value", e.target.value)}
                      style={{ width: 180 }}
                    />
                    <Input
                      placeholder="中文名称"
                      value={ts.label}
                      onChange={(e) => updateTaskStatus(idx, "label", e.target.value)}
                      style={{ width: 140 }}
                    />
                    <Select
                      value={ts.color}
                      onChange={(v) => updateTaskStatus(idx, "color", v)}
                      style={{ width: 120 }}
                      options={[
                        { label: "默认", value: "default" },
                        { label: "蓝色", value: "blue" },
                        { label: "绿色", value: "green" },
                        { label: "红色", value: "red" },
                        { label: "橙色", value: "orange" },
                        { label: "紫色", value: "purple" },
                        { label: "处理中", value: "processing" },
                      ]}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeTaskStatus(idx)}
                    />
                  </Space>
                ))}
                <Button type="dashed" onClick={addTaskStatus} icon={<PlusOutlined />} block>
                  添加任务状态
                </Button>
              </Card>

              {/* 问题严重级别 */}
              <Card title="问题严重级别" style={{ marginBottom: 16 }}>
                {issueSeverities.map((sev, idx) => (
                  <Space key={idx} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                    <Input
                      placeholder="枚举值 (如 critical)"
                      value={sev.value}
                      onChange={(e) => updateIssueSeverity(idx, "value", e.target.value)}
                      style={{ width: 180 }}
                    />
                    <Input
                      placeholder="中文名称"
                      value={sev.label}
                      onChange={(e) => updateIssueSeverity(idx, "label", e.target.value)}
                      style={{ width: 140 }}
                    />
                    <Select
                      value={sev.color}
                      onChange={(v) => updateIssueSeverity(idx, "color", v)}
                      style={{ width: 120 }}
                      options={[
                        { label: "默认", value: "default" },
                        { label: "蓝色", value: "blue" },
                        { label: "绿色", value: "green" },
                        { label: "红色", value: "red" },
                        { label: "橙色", value: "orange" },
                        { label: "紫色", value: "purple" },
                      ]}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeIssueSeverity(idx)}
                    />
                  </Space>
                ))}
                <Button type="dashed" onClick={addIssueSeverity} icon={<PlusOutlined />} block>
                  添加严重级别
                </Button>
              </Card>

              {/* 项目阶段 */}
              <Card title="项目阶段类型" style={{ marginBottom: 16 }}>
                {projectStages.map((ps, idx) => (
                  <Space key={idx} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                    <Input
                      placeholder="枚举值 (如 requirements)"
                      value={ps.value}
                      onChange={(e) => updateProjectStage(idx, "value", e.target.value)}
                      style={{ width: 180 }}
                    />
                    <Input
                      placeholder="中文名称"
                      value={ps.label}
                      onChange={(e) => updateProjectStage(idx, "label", e.target.value)}
                      style={{ width: 200 }}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeProjectStage(idx)}
                    />
                  </Space>
                ))}
                <Button type="dashed" onClick={addProjectStage} icon={<PlusOutlined />} block>
                  添加项目阶段
                </Button>
              </Card>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>保存</Button>
                  <Button icon={<UndoOutlined />} onClick={handleResetProject}>恢复默认</Button>
                </Space>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          {/* ---- 供应商配置 Tab ---- */}
          <Tabs.TabPane tab="供应商配置" key="supplier-config">
            <Form
              form={supplierForm}
              layout="vertical"
              onFinish={handleSaveSupplier}
              initialValues={supplierConfig}
              style={{ maxWidth: 640 }}
            >
              {/* 供应商类型 */}
              <Card title="供应商类型" style={{ marginBottom: 16 }}>
                {supplierTypes.map((st, idx) => (
                  <Space key={idx} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                    <Input
                      placeholder="枚举值 (如 design)"
                      value={st.value}
                      onChange={(e) => updateSupplierType(idx, "value", e.target.value)}
                      style={{ width: 180 }}
                    />
                    <Input
                      placeholder="中文名称"
                      value={st.label}
                      onChange={(e) => updateSupplierType(idx, "label", e.target.value)}
                      style={{ width: 200 }}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeSupplierType(idx)}
                    />
                  </Space>
                ))}
                <Button type="dashed" onClick={addSupplierType} icon={<PlusOutlined />} block>
                  添加供应商类型
                </Button>
              </Card>

              {/* 供应商评级 */}
              <Card title="供应商评级等级" style={{ marginBottom: 16 }}>
                {supplierRatings.map((sr, idx) => (
                  <Space key={idx} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                    <Input
                      placeholder="等级 (如 A)"
                      value={sr.value}
                      onChange={(e) => updateSupplierRating(idx, "value", e.target.value)}
                      style={{ width: 80 }}
                    />
                    <Input
                      placeholder="等级名称"
                      value={sr.label}
                      onChange={(e) => updateSupplierRating(idx, "label", e.target.value)}
                      style={{ width: 100 }}
                    />
                    <Input
                      placeholder="描述"
                      value={sr.description}
                      onChange={(e) => updateSupplierRating(idx, "description", e.target.value)}
                      style={{ width: 200 }}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeSupplierRating(idx)}
                    />
                  </Space>
                ))}
                <Button type="dashed" onClick={addSupplierRating} icon={<PlusOutlined />} block>
                  添加评级等级
                </Button>
              </Card>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>保存</Button>
                  <Button icon={<UndoOutlined />} onClick={handleResetSupplier}>恢复默认</Button>
                </Space>
              </Form.Item>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </Card>

      <Modal title={t("admin.addUser")} open={userModalOpen}
        onOk={() => userForm.validateFields().then((v) => createUserMutation.mutate(v))}
        onCancel={() => { setUserModalOpen(false); userForm.resetFields(); }}
        confirmLoading={createUserMutation.isPending}>
        <Form form={userForm} layout="vertical">
          <Form.Item name="name" label={t("admin.name")} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label={t("admin.email")}><Input /></Form.Item>
          <Form.Item name="role" label={t("admin.role")} initialValue="engineer">
            <Select options={Object.keys(roleColors).map((k) => ({ label: k, value: k }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={t("admin.editUser")} open={editUserOpen}
        onOk={() => editForm.validateFields().then((v) => updateUserMutation.mutate({ id: selectedUser?.id as string, data: v }))}
        onCancel={() => { setEditUserOpen(false); setSelectedUser(null); }}
        confirmLoading={updateUserMutation.isPending}>
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label={t("admin.name")} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label={t("admin.email")}><Input /></Form.Item>
          <Form.Item name="role" label={t("admin.role")}>
            <Select options={Object.keys(roleColors).map((k) => ({ label: k, value: k }))} />
          </Form.Item>
          <Form.Item name="is_active" label={t("admin.status")}>
            <Select options={[{ label: t("common.active"), value: true }, { label: t("common.inactive"), value: false }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
