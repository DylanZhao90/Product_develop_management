import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type {
  ApiResponse,
  AuthTokens,
  DashboardStats,
  FirmwareUpgradeTask,
  FirmwareVersion,
  PaginatedResponse,
  Product,
  ProductCreate,
  ProductUpdate,
  Project,
  ProjectTask,
  TechnicalIssue,
  Supplier,
  Certification,
  AnalyticsOverview,
  TaskStats,
  TrendPoint,
  IssueDistribution,
  LifecycleChangeLog,
  LifecycleTransition,
  User,
} from "./api-types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Send httpOnly cookies automatically
});

// Track pending refresh to avoid concurrent refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: void) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
}

// Handle 401 with cookie-based refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes("/auth/")) {
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => api(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      // Refresh via cookie — no request body needed
      await axios.post(
        `${BASE_URL}/api/v1/auth/refresh`,
        {},
        { withCredentials: true }
      );

      processQueue(null);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      // Clear cookies by calling logout
      await axios.post(`${BASE_URL}/api/v1/auth/logout`, {}, { withCredentials: true }).catch(() => {});
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ---- Auth API ----

export const authApi = {
  getLoginUrl: () => api.get<{ auth_url: string; state: string }>("/auth/feishu/login"),
  callback: (code: string, state: string) =>
    api.post<{ success: boolean; user: User }>("/auth/feishu/callback", { code, state }),
  getMe: () => api.get<{ id: string; name: string; email: string | null; role: string }>("/auth/me"),
  refresh: () => api.post("/auth/refresh"),
  logout: () => api.post("/auth/logout"),
};

// ---- Product API ----

export const productApi = {
  list: (params?: {
    page?: number; page_size?: number; status?: string; type?: string; search?: string;
  }) => api.get<PaginatedResponse<Product>>("/products", { params }),
  get: (id: string) => api.get<ApiResponse<Product>>(`/products/${id}`),
  create: (data: ProductCreate) => api.post<ApiResponse<Product>>("/products", data),
  update: (id: string, data: ProductUpdate) =>
    api.patch<ApiResponse<Product>>(`/products/${id}`, data),
  getLifecycleLogs: (id: string) =>
    api.get<ApiResponse<LifecycleChangeLog[]>>(`/products/${id}/lifecycle/logs`),
  transitionLifecycle: (id: string, data: LifecycleTransition) =>
    api.post<ApiResponse<{ product: Product; log: LifecycleChangeLog }>>(
      `/products/${id}/lifecycle/transition`, data
    ),
};

// ---- Dashboard API ----

export const dashboardApi = {
  getStats: () => api.get<ApiResponse<DashboardStats>>("/dashboard/stats"),
};

// ---- Project API ----

export const projectApi = {
  list: (params?: { page?: number; page_size?: number; product_id?: string; status?: string }) =>
    api.get<PaginatedResponse<Project>>("/projects", { params }),
  get: (id: string) => api.get<ApiResponse<Project>>(`/projects/${id}`),
  create: (data: Record<string, unknown>) => api.post<ApiResponse<Project>>("/projects", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<Project>>(`/projects/${id}`, data),
  submitApproval: (id: string) => api.post(`/projects/${id}/submit-approval`),
  getTasks: (id: string) => api.get<ApiResponse<ProjectTask[]>>(`/projects/${id}/tasks`),
  getTaskTree: (id: string) => api.get<ApiResponse<ProjectTask[]>>(`/projects/${id}/tasks/tree`),
  createTask: (id: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<ProjectTask>>(`/projects/${id}/tasks`, data),
  updateTask: (projectId: string, taskId: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<ProjectTask>>(`/projects/${projectId}/tasks/${taskId}`, data),
  getIssues: (id: string) => api.get<ApiResponse<TechnicalIssue[]>>(`/projects/${id}/issues`),
  createIssue: (id: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<TechnicalIssue>>(`/projects/${id}/issues`, data),
  updateIssue: (projectId: string, issueId: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<TechnicalIssue>>(`/projects/${projectId}/issues/${issueId}`, data),
};

// ---- Design API ----

export const designApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Record<string, unknown>>>("/design-files", { params }),
  get: (id: string) => api.get(`/design-files/${id}`),
  getVersions: (id: string) => api.get(`/design-files/${id}/versions`),
  download: (id: string) => api.get(`/design-files/${id}/download`),
  upload: (formData: FormData) =>
    api.post("/design-files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// ---- Supplier API ----

export const supplierApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Supplier>>("/suppliers", { params }),
  get: (id: string) => api.get<ApiResponse<Supplier>>(`/suppliers/${id}`),
  create: (data: Record<string, unknown>) => api.post<ApiResponse<Supplier>>("/suppliers", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<Supplier>>(`/suppliers/${id}`, data),
  getOutsourceTasks: (supplierId: string) => api.get(`/suppliers/${supplierId}/outsource-tasks`),
  createOutsourceTask: (supplierId: string, data: Record<string, unknown>) =>
    api.post(`/suppliers/${supplierId}/outsource-tasks`, data),
  updateOutsourceTask: (supplierId: string, taskId: string, data: Record<string, unknown>) =>
    api.patch(`/suppliers/${supplierId}/outsource-tasks/${taskId}`, data),
  reviewOutsourceTask: (supplierId: string, taskId: string, data: Record<string, unknown>) =>
    api.post(`/suppliers/${supplierId}/outsource-tasks/${taskId}/review`, data),
};

// ---- Firmware API ----

export const firmwareApi = {
  listVersions: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<FirmwareVersion>>("/firmware/versions", { params }),
  getVersion: (id: string) => api.get<ApiResponse<FirmwareVersion>>(`/firmware/versions/${id}`),
  createVersion: (data: Record<string, unknown>) =>
    api.post<ApiResponse<FirmwareVersion>>("/firmware/versions", data),
  uploadFirmware: (formData: FormData) =>
    api.post("/firmware/versions/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  listUpgradeTasks: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<FirmwareUpgradeTask>>("/firmware/upgrade-tasks", { params }),
  getUpgradeTask: (id: string) =>
    api.get<ApiResponse<FirmwareUpgradeTask>>(`/firmware/upgrade-tasks/${id}`),
  createUpgradeTask: (data: Record<string, unknown>) =>
    api.post<ApiResponse<FirmwareUpgradeTask>>("/firmware/upgrade-tasks", data),
  updateUpgradeTask: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<FirmwareUpgradeTask>>(`/firmware/upgrade-tasks/${id}`, data),
  cancelUpgradeTask: (id: string) => api.post(`/firmware/upgrade-tasks/${id}/cancel`),
};

// ---- Admin API ----

export const adminApi = {
  listUsers: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<User>>("/admin/users", { params }),
  createUser: (data: Record<string, unknown>) => api.post<ApiResponse<User>>("/admin/users", data),
  updateUser: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<User>>(`/admin/users/${id}`, data),
  getAuditLogs: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Record<string, unknown>>>("/admin/audit-logs", { params }),
};

// ---- Certification API ----

export const certApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Certification>>("/certifications", { params }),
  get: (id: string) => api.get<ApiResponse<Certification>>(`/certifications/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Certification>>("/certifications", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<Certification>>(`/certifications/${id}`, data),
  expiring: (days: number = 90) =>
    api.get<ApiResponse<Certification[]>>("/certifications/expiring/list", { params: { days } }),
};

// ---- Analytics API ----

export const analyticsApi = {
  getOverview: () => api.get<ApiResponse<AnalyticsOverview>>("/analytics/overview"),
  getTrends: () => api.get<ApiResponse<TrendPoint[]>>("/analytics/trends"),
  getTaskStats: () => api.get<ApiResponse<TaskStats>>("/analytics/task-stats"),
  getIssueDistribution: () =>
    api.get<ApiResponse<IssueDistribution[]>>("/analytics/issue-distribution"),
};
