import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Track if a refresh is already in progress to avoid multiple concurrent refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

// Attach JWT token to requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 with refresh token retry logic
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only handle 401 on non-auth endpoints
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh if we're already on a token endpoint
    if (originalRequest.url?.includes("/auth/")) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // Queue concurrent requests while refreshing
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const resp = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token } = resp.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
      }

      processQueue(null, access_token);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ---- Product API ----

export const productApi = {
  list: (params?: Record<string, unknown>) => api.get("/products", { params }),
  get: (id: string) => api.get(`/products/${id}`),
  create: (data: Record<string, unknown>) => api.post("/products", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/products/${id}`, data),
  getLifecycleLogs: (id: string) => api.get(`/products/${id}/lifecycle/logs`),
  transitionLifecycle: (id: string, data: { to_status: string; reason?: string }) =>
    api.post(`/products/${id}/lifecycle/transition`, data),
};

// ---- Dashboard API ----

export const dashboardApi = {
  getStats: () => api.get("/dashboard/stats"),
};

// ---- Project API ----

export const projectApi = {
  list: (params?: Record<string, unknown>) => api.get("/projects", { params }),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: Record<string, unknown>) => api.post("/projects", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/projects/${id}`, data),
  submitApproval: (id: string) => api.post(`/projects/${id}/submit-approval`),
  getTasks: (id: string) => api.get(`/projects/${id}/tasks`),
  createTask: (id: string, data: Record<string, unknown>) => api.post(`/projects/${id}/tasks`, data),
  updateTask: (projectId: string, taskId: string, data: Record<string, unknown>) =>
    api.patch(`/projects/${projectId}/tasks/${taskId}`, data),
  getIssues: (id: string) => api.get(`/projects/${id}/issues`),
  createIssue: (id: string, data: Record<string, unknown>) => api.post(`/projects/${id}/issues`, data),
  updateIssue: (projectId: string, issueId: string, data: Record<string, unknown>) =>
    api.patch(`/projects/${projectId}/issues/${issueId}`, data),
};

// ---- Design API ----

export const designApi = {
  list: (params?: Record<string, unknown>) => api.get("/design-files", { params }),
  get: (id: string) => api.get(`/design-files/${id}`),
  getVersions: (id: string) => api.get(`/design-files/${id}/versions`),
  download: (id: string) => api.get(`/design-files/${id}/download`),
  upload: (formData: FormData) => api.post("/design-files/upload", formData),
};

// ---- Supplier API ----

export const supplierApi = {
  list: (params?: Record<string, unknown>) => api.get("/suppliers", { params }),
  get: (id: string) => api.get(`/suppliers/${id}`),
  create: (data: Record<string, unknown>) => api.post("/suppliers", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/suppliers/${id}`, data),
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
  listVersions: (params?: Record<string, unknown>) => api.get("/firmware/versions", { params }),
  getVersion: (id: string) => api.get(`/firmware/versions/${id}`),
  createVersion: (data: Record<string, unknown>) => api.post("/firmware/versions", data),
  uploadFirmware: (formData: FormData) => api.post("/firmware/versions/upload", formData),
  listUpgradeTasks: (params?: Record<string, unknown>) => api.get("/firmware/upgrade-tasks", { params }),
  getUpgradeTask: (id: string) => api.get(`/firmware/upgrade-tasks/${id}`),
  createUpgradeTask: (data: Record<string, unknown>) => api.post("/firmware/upgrade-tasks", data),
  updateUpgradeTask: (id: string, data: Record<string, unknown>) => api.patch(`/firmware/upgrade-tasks/${id}`, data),
  cancelUpgradeTask: (id: string) => api.post(`/firmware/upgrade-tasks/${id}/cancel`),
};


// ---- Admin API ----

export const adminApi = {
  listUsers: (params?: Record<string, unknown>) => api.get("/admin/users", { params }),
  createUser: (data: Record<string, unknown>) => api.post("/admin/users", data),
  updateUser: (id: string, data: Record<string, unknown>) => api.patch(`/admin/users/${id}`, data),
  getAuditLogs: (params?: Record<string, unknown>) => api.get("/admin/audit-logs", { params }),
};

// ---- Certification API ----

export const certApi = {
  list: (params?: Record<string, unknown>) => api.get("/certifications", { params }),
  get: (id: string) => api.get(`/certifications/${id}`),
  create: (data: Record<string, unknown>) => api.post("/certifications", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/certifications/${id}`, data),
  expiring: (days: number = 90) => api.get("/certifications/expiring/list", { params: { days } }),
};

// ---- Analytics API ----

export const analyticsApi = {
  getOverview: () => api.get("/analytics/overview"),
  getTrends: () => api.get("/analytics/trends"),
  getTaskStats: () => api.get("/analytics/task-stats"),
  getIssueDistribution: () => api.get("/analytics/issue-distribution"),
};
