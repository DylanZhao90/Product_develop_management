import type { User, PaginatedResponse } from "../api-types";

const ROLES = ["admin", "pm", "designer", "engineer", "supplier", "cert_specialist", "ops"];

const NAMES = ["张明", "李华", "王芳", "赵强", "陈静", "刘洋", "周磊", "吴婷", "郑鹏", "孙悦"];

function randomRole() {
  return ROLES[Math.floor(Math.random() * ROLES.length)];
}

// ── In-memory user store (survives within session) ──
// Created users are pushed here so add/edit/delete actually persist in mock mode.
let userStore: User[] | null = null;

function getBaseUsers(): User[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `mock-user-${String(i + 1).padStart(3, "0")}`,
    feishu_open_id: `ou_${Math.random().toString(36).substring(2, 10)}`,
    name: NAMES[i],
    email: `user${i + 1}@pdm.local`,
    avatar_url: null,
    role: randomRole(),
    supplier_id: null,
    language_pref: "zh-CN",
    is_active: i % 3 !== 2,
  }));
}

function getStore(): User[] {
  if (!userStore) userStore = getBaseUsers();
  return userStore;
}

/** Reset store (for testing) */
export function resetUserStore(): void {
  userStore = null;
}

/**
 * Add a user to the mock store. Returns the created user.
 */
export function addMockUser(data: Record<string, unknown>): User {
  const store = getStore();
  const newUser: User = {
    id: `mock-user-${Date.now()}`,
    feishu_open_id: null,
    name: (data.name as string) || "新用户",
    email: (data.email as string) || null,
    avatar_url: null,
    role: (data.role as string) || "engineer",
    supplier_id: null,
    language_pref: "zh-CN",
    is_active: true,
  };
  store.push(newUser);
  return newUser;
}

/**
 * Update a user in the mock store. Returns the updated user.
 */
export function updateMockUser(id: string, data: Record<string, unknown>): User | null {
  const store = getStore();
  const idx = store.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  store[idx] = { ...store[idx], ...data } as User;
  return store[idx];
}

/**
 * Mock 10 users for admin user management (fallback when backend is unavailable).
 * Includes any users added via addMockUser during the session.
 */
export function buildMockUsers(params?: Record<string, unknown>): PaginatedResponse<User> {
  const search = (params?.search as string) || "";
  const page = (params?.page as number) || 1;
  const pageSize = (params?.page_size as number) || 20;

  const allUsers = getStore();

  const filtered = search
    ? allUsers.filter((u) => u.name?.includes(search) || u.email?.includes(search))
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
    created.setMinutes(created.getMinutes() - i * 15);
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
