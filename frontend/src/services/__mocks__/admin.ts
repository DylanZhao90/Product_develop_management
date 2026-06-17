import type { User, PaginatedResponse } from "../api-types";

const ROLES = ["admin", "pm", "designer", "engineer", "supplier", "cert_specialist", "ops"];

function randomRole() {
  return ROLES[Math.floor(Math.random() * ROLES.length)];
}

function randomDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  return d.toISOString();
}

/**
 * Mock 10 users for admin user management (fallback when backend is unavailable).
 */
export function buildMockUsers(params?: Record<string, unknown>): PaginatedResponse<User> {
  const search = (params?.search as string) || "";
  const page = (params?.page as number) || 1;
  const pageSize = (params?.page_size as number) || 20;

  const allUsers: User[] = Array.from({ length: 10 }, (_, i) => ({
    id: `mock-user-${String(i + 1).padStart(3, "0")}`,
    feishu_open_id: `ou_${Math.random().toString(36).substring(2, 10)}`,
    name: ["张明", "李华", "王芳", "赵强", "陈静", "刘洋", "周磊", "吴婷", "郑鹏", "孙悦"][i],
    email: `user${i + 1}@pdm.local`,
    avatar_url: null,
    role: randomRole(),
    supplier_id: null,
    language_pref: "zh-CN",
    is_active: i % 3 !== 2, // 2 out of 3 are active
  }));

  const filtered = search
    ? allUsers.filter((u) => u.name.includes(search) || u.email?.includes(search))
    : allUsers;

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return {
    success: true,
    data,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  };
}

/**
 * Mock 20 audit logs (time-descending).
 */
export function buildMockAuditLogs(params?: Record<string, unknown>): PaginatedResponse<Record<string, unknown>> {
  const page = (params?.page as number) || 1;
  const pageSize = (params?.page_size as number) || 20;

  const actions = [
    "创建产品", "删除产品", "更新产品信息",
    "状态流转", "创建项目", "审批项目",
    "添加用户", "更新用户角色", "停用用户",
    "上传固件", "创建 OTA 任务", "删除固件版本",
    "添加供应商", "更新供应商", "审核外包任务",
    "添加认证", "更新认证", "删除认证",
  ];

  const resources = ["product", "project", "user", "firmware", "supplier", "certification"];

  const logs: Record<string, unknown>[] = Array.from({ length: 20 }, (_, i) => {
    const created = new Date();
    created.setMinutes(created.getMinutes() - i * 15); // time descending
    return {
      id: `audit-mock-${String(i + 1).padStart(3, "0")}`,
      action: actions[Math.floor(Math.random() * actions.length)],
      resource_type: resources[Math.floor(Math.random() * resources.length)],
      resource_id: `res-${Math.random().toString(36).substring(2, 10)}`,
      user_id: `mock-user-${String(Math.floor(Math.random() * 10) + 1).padStart(3, "0")}`,
      created_at: created.toISOString(),
      details: null,
    };
  }).sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());

  const total = logs.length;
  const start = (page - 1) * pageSize;
  const data = logs.slice(start, start + pageSize);

  return {
    success: true,
    data,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  };
}
