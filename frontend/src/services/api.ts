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
  LifecycleAnalyticsData,
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

// ---- Product API (with mock fallback) ----

const MOCK_PRODUCTS: Product[] = [
  { id: "prod-1", project_id: "proj-1", code: "AC-220-EU", model: "AC-220-EU", name: "AC Charger 220V EU", type: "ac_charger", target_markets: ["EU"], certification_requirements: ["CE","ROHS"], lifecycle_status: "on_sale", product_manager_id: null, thumbnail_url: null, description: "Standard AC charger for EU", created_at: "2025-01-15T00:00:00Z", updated_at: "2025-06-01T00:00:00Z" },
  { id: "prod-2", project_id: "proj-2", code: "DC-480-US", model: "DC-480-US", name: "DC Charger 480W US", type: "dc_charger", target_markets: ["US"], certification_requirements: ["UL","FCC"], lifecycle_status: "on_sale", product_manager_id: null, thumbnail_url: null, description: null, created_at: "2025-02-10T00:00:00Z", updated_at: null },
  { id: "prod-3", project_id: "proj-3", code: "PF-3.3-JP", model: "PF-3.3-JP", name: "Portable Charger 3.3kW JP", type: "portable", target_markets: ["JP"], certification_requirements: ["PSE"], lifecycle_status: "in_development", product_manager_id: null, thumbnail_url: null, description: null, created_at: "2025-03-01T00:00:00Z", updated_at: null },
  { id: "prod-4", project_id: "proj-4", code: "AC-110-US", model: "AC-110-US", name: "AC Charger 110V US", type: "ac_charger", target_markets: ["US","CA"], certification_requirements: ["UL","FCC"], lifecycle_status: "trial_handover", product_manager_id: null, thumbnail_url: null, description: "US market AC charger", created_at: "2025-03-20T00:00:00Z", updated_at: "2025-05-15T00:00:00Z" },
  { id: "prod-5", project_id: "proj-5", code: "DC-200-CN", model: "DC-200-CN", name: "DC Charger 200W CN", type: "dc_charger", target_markets: ["CN"], certification_requirements: ["CCC"], lifecycle_status: "on_sale", product_manager_id: null, thumbnail_url: null, description: null, created_at: "2024-11-05T00:00:00Z", updated_at: null },
  { id: "prod-6", project_id: "proj-6", code: "AC-380-EU", model: "AC-380-EU", name: "AC Charger 380V EU", type: "ac_charger", target_markets: ["EU","UK"], certification_requirements: ["CE","UKCA"], lifecycle_status: "in_development", product_manager_id: null, thumbnail_url: null, description: "Three-phase AC charger", created_at: "2025-04-10T00:00:00Z", updated_at: null },
  { id: "prod-7", project_id: "proj-7", code: "PF-7.7-US", model: "PF-7.7-US", name: "Portable Charger 7.7kW US", type: "portable", target_markets: ["US"], certification_requirements: ["UL","FCC"], lifecycle_status: "discontinued", product_manager_id: null, thumbnail_url: null, description: null, created_at: "2024-06-01T00:00:00Z", updated_at: "2025-03-01T00:00:00Z" },
  { id: "prod-8", project_id: "proj-8", code: "DC-1500-EU", model: "DC-1500-EU", name: "DC Charger 1500W EU", type: "dc_charger", target_markets: ["EU"], certification_requirements: ["CE","TUV"], lifecycle_status: "eol", product_manager_id: null, thumbnail_url: null, description: "High power DC (EOL)", created_at: "2023-09-15T00:00:00Z", updated_at: "2025-01-10T00:00:00Z" },
  { id: "prod-9", project_id: "proj-9", code: "AC-220-AU", model: "AC-220-AU", name: "AC Charger 220V AU", type: "ac_charger", target_markets: ["AU","NZ"], certification_requirements: ["RCM"], lifecycle_status: "on_sale", product_manager_id: null, thumbnail_url: null, description: "Australian standard", created_at: "2025-05-01T00:00:00Z", updated_at: null },
  { id: "prod-10", project_id: "proj-10", code: "PF-2.2-KR", model: "PF-2.2-KR", name: "Portable Charger 2.2kW KR", type: "portable", target_markets: ["KR"], certification_requirements: ["KC"], lifecycle_status: "trial_handover", product_manager_id: null, thumbnail_url: null, description: null, created_at: "2025-04-20T00:00:00Z", updated_at: null },
];

// In-memory mutable store for mock fallback — items created/updated in catch blocks persist here
let _products = [...MOCK_PRODUCTS];

export const productApi = {
  list: async (params?: {
    page?: number; page_size?: number; status?: string; type?: string; search?: string;
  }): Promise<{ data: PaginatedResponse<Product> }> => {
    try {
      const res = await api.get<PaginatedResponse<Product>>("/products", { params });
      return { data: res.data };
    } catch {
      const filtered = _products.filter((p) => {
        if (params?.status && p.lifecycle_status !== params.status) return false;
        if (params?.type && p.type !== params.type) return false;
        if (params?.search) {
          const s = params.search.toLowerCase();
          const marketsMatch = Array.isArray(p.target_markets) && p.target_markets.some((m) => m.toLowerCase().includes(s));
          const certsMatch = Array.isArray(p.certification_requirements) && p.certification_requirements.some((c) => c.toLowerCase().includes(s));
          if (
            !p.code.toLowerCase().includes(s) &&
            !p.name.toLowerCase().includes(s) &&
            !p.model.toLowerCase().includes(s) &&
            !marketsMatch &&
            !certsMatch
          ) return false;
        }
        return true;
      });
      return {
        data: {
          success: true, data: filtered,
          total: filtered.length,
          page: params?.page ?? 1,
          page_size: params?.page_size ?? 20,
          total_pages: Math.ceil(filtered.length / (params?.page_size ?? 20)),
        },
      };
    }
  },
  get: async (id: string): Promise<{ data: ApiResponse<Product> }> => {
    try {
      const res = await api.get<ApiResponse<Product>>(`/products/${id}`);
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true,
          data: _products.find((p) => p.id === id) ?? (() => {
            const fallback: Product = { id, project_id: "proj-1", code: "AC-220-EU", model: "AC-220-EU", name: "AC Charger 220V EU", type: "ac_charger", target_markets: ["EU"], certification_requirements: ["CE","ROHS"], lifecycle_status: "on_sale", product_manager_id: null, thumbnail_url: null, description: null, created_at: "2025-01-15T00:00:00Z", updated_at: null };
            _products.push(fallback);
            return fallback;
          })(),
        },
      };
    }
  },
  create: async (data: ProductCreate): Promise<{ data: ApiResponse<Product> }> => {
    try {
      const res = await api.post<ApiResponse<Product>>("/products", data);
      return { data: res.data };
    } catch {
      const newItem = {
        id: `mock-${Date.now()}`, project_id: data.project_id ?? "", code: data.model, model: data.model, name: data.name,
        type: data.type ?? null, target_markets: data.target_markets ?? null,
        certification_requirements: data.certification_requirements ?? null,
        lifecycle_status: "in_development", product_manager_id: null, thumbnail_url: null,
        description: data.description ?? null, created_at: new Date().toISOString(), updated_at: null,
      } as Product;
      _products.push(newItem);
      return {
        data: { success: true, data: newItem },
      };
    }
  },
  update: async (id: string, data: ProductUpdate): Promise<{ data: ApiResponse<Product> }> => {
    try {
      const res = await api.patch<ApiResponse<Product>>(`/products/${id}`, data);
      return { data: res.data };
    } catch {
      const idx = _products.findIndex((p) => p.id === id);
      if (idx !== -1) {
        _products[idx] = { ..._products[idx], ...data, updated_at: new Date().toISOString() } as Product;
      }
      return {
        data: {
          success: true,
          data: idx !== -1 ? _products[idx] : { id, project_id: "", ...data, lifecycle_status: "on_sale", created_at: "2025-01-15T00:00:00Z", updated_at: new Date().toISOString(), code: "AC-220-EU", model: "AC-220-EU", name: "AC Charger", type: "ac_charger", target_markets: null, certification_requirements: null, product_manager_id: null, thumbnail_url: null, description: null } as Product,
        },
      };
    }
  },
  delete: async (id: string): Promise<{ data: ApiResponse<{ message: string }> }> => {
    try {
      const res = await api.delete<ApiResponse<{ message: string }>>(`/products/${id}`);
      return { data: res.data };
    } catch {
      return { data: { success: true, data: { message: "ok" } } };
    }
  },
  getLifecycleLogs: async (id: string): Promise<{ data: ApiResponse<LifecycleChangeLog[]> }> => {
    try {
      const res = await api.get<ApiResponse<LifecycleChangeLog[]>>(`/products/${id}/lifecycle/logs`);
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true,
          data: [
            { id: `ll-${id}-1`, product_id: id, from_status: "in_development", to_status: "trial_handover", approval_id: null, changed_by: "user-1", reason: "Prototype validation passed", changed_at: "2025-03-15T10:00:00Z" },
            { id: `ll-${id}-2`, product_id: id, from_status: "trial_handover", to_status: "on_sale", approval_id: null, changed_by: "user-1", reason: "Trial production completed", changed_at: "2025-04-20T14:30:00Z" },
            { id: `ll-${id}-3`, product_id: id, from_status: "on_sale", to_status: "discontinued", approval_id: null, changed_by: "user-2", reason: "End of sale", changed_at: "2025-08-01T09:00:00Z" },
            { id: `ll-${id}-4`, product_id: id, from_status: "discontinued", to_status: "eol", approval_id: null, changed_by: "user-2", reason: "EOL decision", changed_at: "2025-10-15T16:45:00Z" },
            { id: `ll-${id}-5`, product_id: id, from_status: "in_development", to_status: "in_development", approval_id: null, changed_by: "user-3", reason: "Design revision A2", changed_at: "2025-02-28T11:20:00Z" },
          ],
        },
      };
    }
  },
  transitionLifecycle: async (id: string, data: LifecycleTransition): Promise<{ data: ApiResponse<{ product: Product; log: LifecycleChangeLog }> }> => {
    try {
      const res = await api.post<ApiResponse<{ product: Product; log: LifecycleChangeLog }>>(`/products/${id}/lifecycle/transition`, data);
      return { data: res.data };
    } catch {
      const product = _products.find((p) => p.id === id) ?? _products[0];
      const updatedProduct = { ...product, lifecycle_status: data.to_status, updated_at: new Date().toISOString() } as Product;
      const idx = _products.findIndex((p) => p.id === id);
      if (idx !== -1) _products[idx] = updatedProduct;
      return {
        data: {
          success: true,
          data: {
            product: updatedProduct,
            log: { id: `ll-${Date.now()}`, product_id: id, from_status: product.lifecycle_status, to_status: data.to_status, approval_id: null, changed_by: "mock-user", reason: data.reason ?? null, changed_at: new Date().toISOString() },
          },
        },
      };
    }
  },
};

// ---- Dashboard API (with mock fallback) ----

export const dashboardApi = {
  getStats: async (): Promise<{ data: ApiResponse<DashboardStats> }> => {
    try {
      const res = await api.get<ApiResponse<DashboardStats>>("/dashboard/stats");
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true,
          data: {
            active_products: 18,
            active_projects: 12,
            pending_tasks: 47,
            completed_tasks: 36,
            recent_projects: [
              { id: "proj-1", name: "AC-220-EU Mass Production", status: "in_progress", created_at: "2025-05-01T00:00:00Z" },
              { id: "proj-2", name: "DC-480-US Beta Testing", status: "approved", created_at: "2025-05-15T00:00:00Z" },
              { id: "proj-3", name: "PF-3.3-JP Feasibility Study", status: "pending_approval", created_at: "2025-06-01T00:00:00Z" },
              { id: "proj-4", name: "AC-110-US Certification", status: "completed", created_at: "2025-04-10T00:00:00Z" },
              { id: "proj-5", name: "DC-200-CN Prototype", status: "in_progress", created_at: "2025-03-20T00:00:00Z" },
            ],
            recent_tasks: [
              { id: "task-1", name: "PCB layout review", status: "completed", created_at: "2025-06-10T00:00:00Z" },
              { id: "task-2", name: "EMC testing", status: "in_progress", created_at: "2025-06-08T00:00:00Z" },
              { id: "task-3", name: "Supplier qualification", status: "pending", created_at: "2025-06-05T00:00:00Z" },
              { id: "task-4", name: "Firmware integration", status: "in_progress", created_at: "2025-06-01T00:00:00Z" },
              { id: "task-5", name: "CE documentation", status: "completed", created_at: "2025-05-28T00:00:00Z" },
            ],
          },
        },
      };
    }
  },
};

// ---- Project API (with mock fallback) ----

const MOCK_PROJECTS: Project[] = [
  { id: "proj-1", product_id: "prod-1", name: "AC-220-EU Mass Production", type: "new_product", feasibility_doc_url: null, approval_id: null, feishu_chat_id: null, status: "in_progress", created_by: "user-1", created_at: "2025-05-01T00:00:00Z", updated_at: null },
  { id: "proj-2", product_id: "prod-2", name: "DC-480-US Beta Testing", type: "version_upgrade", feasibility_doc_url: null, approval_id: null, feishu_chat_id: null, status: "approved", created_by: "user-1", created_at: "2025-05-15T00:00:00Z", updated_at: null },
  { id: "proj-3", product_id: "prod-3", name: "PF-3.3-JP Feasibility Study", type: "new_product", feasibility_doc_url: null, approval_id: null, feishu_chat_id: null, status: "pending_approval", created_by: "user-2", created_at: "2025-06-01T00:00:00Z", updated_at: null },
  { id: "proj-4", product_id: "prod-4", name: "AC-110-US Certification", type: "new_product", feasibility_doc_url: null, approval_id: null, feishu_chat_id: null, status: "completed", created_by: "user-3", created_at: "2025-04-10T00:00:00Z", updated_at: "2025-05-20T00:00:00Z" },
  { id: "proj-5", product_id: "prod-5", name: "DC-200-CN Prototype", type: "version_upgrade", feasibility_doc_url: null, approval_id: null, feishu_chat_id: null, status: "in_progress", created_by: "user-1", created_at: "2025-03-20T00:00:00Z", updated_at: null },
  { id: "proj-6", product_id: "prod-6", name: "AC-380-EU Design Review", type: "new_product", feasibility_doc_url: null, approval_id: null, feishu_chat_id: null, status: "in_progress", created_by: "user-2", created_at: "2025-06-05T00:00:00Z", updated_at: null },
  { id: "proj-7", product_id: "prod-7", name: "PF-7.7-US Phase Out", type: "new_product", feasibility_doc_url: null, approval_id: null, feishu_chat_id: null, status: "closed", created_by: "user-3", created_at: "2024-08-01T00:00:00Z", updated_at: "2025-03-01T00:00:00Z" },
  { id: "proj-8", product_id: "prod-8", name: "DC-1500-EU EOL Process", type: "version_upgrade", feasibility_doc_url: null, approval_id: null, feishu_chat_id: null, status: "completed", created_by: "user-1", created_at: "2023-10-01T00:00:00Z", updated_at: "2025-01-15T00:00:00Z" },
  { id: "proj-9", product_id: "prod-9", name: "AC-220-AU Production Ramp", type: "new_product", feasibility_doc_url: null, approval_id: null, feishu_chat_id: null, status: "in_progress", created_by: "user-2", created_at: "2025-05-10T00:00:00Z", updated_at: null },
  { id: "proj-10", product_id: "prod-10", name: "PF-2.2-KR Localization", type: "version_upgrade", feasibility_doc_url: null, approval_id: null, feishu_chat_id: null, status: "approved", created_by: "user-3", created_at: "2025-04-25T00:00:00Z", updated_at: null },
];

const MOCK_TASKS: ProjectTask[] = [
  { id: "task-1", project_id: "proj-1", parent_task_id: null, name: "PCB layout design", responsible_role: "hardware_engineer", assignee_feishu_id: null, supplier_id: null, planned_start: "2025-05-01", planned_end: "2025-06-15", actual_end: null, deliverables: null, status: "in_progress", sort_order: 1 },
  { id: "task-2", project_id: "proj-1", parent_task_id: null, name: "BOM finalization", responsible_role: "procurement", assignee_feishu_id: null, supplier_id: null, planned_start: "2025-05-10", planned_end: "2025-06-01", actual_end: "2025-05-28", deliverables: null, status: "completed", sort_order: 2 },
  { id: "task-3", project_id: "proj-1", parent_task_id: null, name: "EMC pre-compliance test", responsible_role: "testing", assignee_feishu_id: null, supplier_id: "supp-1", planned_start: "2025-06-01", planned_end: "2025-07-15", actual_end: null, deliverables: null, status: "pending", sort_order: 3 },
  { id: "task-4", project_id: "proj-1", parent_task_id: null, name: "Firmware integration", responsible_role: "firmware_engineer", assignee_feishu_id: null, supplier_id: null, planned_start: "2025-06-01", planned_end: "2025-07-01", actual_end: null, deliverables: null, status: "in_progress", sort_order: 4 },
  { id: "task-5", project_id: "proj-1", parent_task_id: "task-1", name: "PCB schematic review", responsible_role: "hardware_engineer", assignee_feishu_id: null, supplier_id: null, planned_start: "2025-05-01", planned_end: "2025-05-15", actual_end: "2025-05-12", deliverables: null, status: "completed", sort_order: 1 },
  { id: "task-6", project_id: "proj-1", parent_task_id: "task-1", name: "PCB layout routing", responsible_role: "hardware_engineer", assignee_feishu_id: null, supplier_id: null, planned_start: "2025-05-15", planned_end: "2025-06-15", actual_end: null, deliverables: null, status: "in_progress", sort_order: 2 },
  { id: "task-7", project_id: "proj-2", parent_task_id: null, name: "Beta test plan creation", responsible_role: "testing", assignee_feishu_id: null, supplier_id: null, planned_start: "2025-05-20", planned_end: "2025-06-10", actual_end: null, deliverables: null, status: "in_progress", sort_order: 1 },
  { id: "task-8", project_id: "proj-2", parent_task_id: null, name: "Field test deployment", responsible_role: "field_engineer", assignee_feishu_id: null, supplier_id: "supp-2", planned_start: "2025-06-10", planned_end: "2025-07-20", actual_end: null, deliverables: null, status: "pending", sort_order: 2 },
];

const MOCK_ISSUES: TechnicalIssue[] = [
  { id: "issue-1", project_id: "proj-1", title: "Overheating at full load", description: "Temperature exceeds 85°C threshold under sustained full load", severity: "critical", assigned_to: "user-1", status: "investigating", resolved_at: null, created_at: "2025-06-10T00:00:00Z" },
  { id: "issue-2", project_id: "proj-1", title: "Wi-Fi module interoperability", description: "Intermittent connection drops with certain access points", severity: "major", assigned_to: "user-2", status: "open", resolved_at: null, created_at: "2025-06-08T00:00:00Z" },
  { id: "issue-3", project_id: "proj-1", title: "CE mark label placement", description: "Label position conflicts with cooling vents", severity: "minor", assigned_to: null, status: "open", resolved_at: null, created_at: "2025-06-05T00:00:00Z" },
  { id: "issue-4", project_id: "proj-2", title: "Firmware version mismatch", description: "Beta units shipped with v1.2 instead of v1.3", severity: "major", assigned_to: "user-3", status: "resolved", resolved_at: "2025-06-12T00:00:00Z", created_at: "2025-06-09T00:00:00Z" },
  { id: "issue-5", project_id: "proj-2", title: "Charging cable connector wear", description: "Connector shows wear after 500 cycles", severity: "minor", assigned_to: null, status: "closed", resolved_at: "2025-06-01T00:00:00Z", created_at: "2025-05-20T00:00:00Z" },
];

let _projects = [...MOCK_PROJECTS];
let _tasks = [...MOCK_TASKS];
let _issues = [...MOCK_ISSUES];

export const projectApi = {
  list: async (params?: { page?: number; page_size?: number; product_id?: string; status?: string }): Promise<{ data: PaginatedResponse<Project> }> => {
    try {
      const res = await api.get<PaginatedResponse<Project>>("/projects", { params });
      return { data: res.data };
    } catch {
      const filtered = _projects.filter((p) => {
        if (params?.status && p.status !== params.status) return false;
        if (params?.product_id && p.product_id !== params.product_id) return false;
        return true;
      });
      return {
        data: {
          success: true, data: filtered,
          total: filtered.length,
          page: params?.page ?? 1,
          page_size: params?.page_size ?? 20,
          total_pages: Math.ceil(filtered.length / (params?.page_size ?? 20)),
        },
      };
    }
  },
  get: async (id: string): Promise<{ data: ApiResponse<Project> }> => {
    try {
      const res = await api.get<ApiResponse<Project>>(`/projects/${id}`);
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true,
          data: _projects.find((p) => p.id === id) ?? {
            id, product_id: "prod-1", name: "Mock Project", type: "new_product",
            feasibility_doc_url: null, approval_id: null, feishu_chat_id: null,
            status: "in_progress", created_by: "mock-user", created_at: new Date().toISOString(), updated_at: null,
          } as Project,
        },
      };
    }
  },
  create: async (data: Record<string, unknown>): Promise<{ data: ApiResponse<Project> }> => {
    try {
      const res = await api.post<ApiResponse<Project>>("/projects", data);
      return { data: res.data };
    } catch {
   const product = _products.find((p) => p.id === data.product_id);
   const newItem = {
     id: `mock-proj-${Date.now()}`, product_id: (data.product_id as string) || "prod-1",
     product_code: product?.code || null,
     name: (data.name as string) || "Mock Project", type: (data.type as "new_product" | "version_upgrade") ?? "new_product",
        feasibility_doc_url: null, approval_id: null, feishu_chat_id: null,
        status: "pending_approval", created_by: "mock-user", created_at: new Date().toISOString(), updated_at: null,
      } as Project;
      _projects.push(newItem);
      return {
        data: { success: true, data: newItem },
      };
    }
  },
  update: async (id: string, data: Record<string, unknown>): Promise<{ data: ApiResponse<Project> }> => {
    try {
      const res = await api.patch<ApiResponse<Project>>(`/projects/${id}`, data);
      return { data: res.data };
    } catch {
      const idx = _projects.findIndex((p) => p.id === id);
      if (idx !== -1) {
        _projects[idx] = { ..._projects[idx], ...data, updated_at: new Date().toISOString() } as unknown as Project;
      }
      const existing = idx !== -1 ? _projects[idx] : _projects[0];
      return { data: { success: true, data: { ...existing, ...data, updated_at: new Date().toISOString() } as unknown as Project } };
    }
  },
  delete: async (id: string): Promise<{ data: ApiResponse<{ message: string }> }> => {
    try {
      const res = await api.delete<ApiResponse<{ message: string }>>(`/projects/${id}`);
      return { data: res.data };
    } catch {
      return { data: { success: true, data: { message: "ok" } } };
    }
  },
  submitApproval: async (id: string): Promise<{ data: ApiResponse<{ message: string }> }> => {
    try {
      const res = await api.post(`/projects/${id}/submit-approval`);
      return { data: res.data as unknown as ApiResponse<{ message: string }> };
    } catch {
      return { data: { success: true, data: { message: "ok" } } };
    }
  },
  getTasks: async (id: string): Promise<{ data: ApiResponse<ProjectTask[]> }> => {
    try {
      const res = await api.get<ApiResponse<ProjectTask[]>>(`/projects/${id}/tasks`);
      return { data: res.data };
    } catch {
      return { data: { success: true, data: _tasks.filter((t) => t.project_id === id).length > 0 ? _tasks.filter((t) => t.project_id === id) : _tasks } };
    }
  },
  getTaskTree: async (id: string): Promise<{ data: ApiResponse<ProjectTask[]> }> => {
    try {
      const res = await api.get<ApiResponse<ProjectTask[]>>(`/projects/${id}/tasks/tree`);
      return { data: res.data };
    } catch {
      const tasks = _tasks.filter((t) => t.project_id === id || !t.project_id).map((t) => ({
        ...t,
        children: _tasks.filter((child) => child.parent_task_id === t.id),
      }));
      return { data: { success: true, data: tasks } };
    }
  },
  createTask: async (id: string, data: Record<string, unknown>): Promise<{ data: ApiResponse<ProjectTask> }> => {
    try {
      const res = await api.post<ApiResponse<ProjectTask>>(`/projects/${id}/tasks`, data);
      return { data: res.data };
    } catch {
      const newItem = {
        id: `mock-task-${Date.now()}`, project_id: id, parent_task_id: (data.parent_task_id as string) || null,
        name: (data.name as string) || "Mock Task", responsible_role: null, assignee_feishu_id: null,
        supplier_id: null, planned_start: null, planned_end: null, actual_end: null,
        deliverables: null, status: "pending", sort_order: 0,
      } as ProjectTask;
      _tasks.push(newItem);
      return {
        data: { success: true, data: newItem },
      };
    }
  },
  updateTask: async (projectId: string, taskId: string, data: Record<string, unknown>): Promise<{ data: ApiResponse<ProjectTask> }> => {
    try {
      const res = await api.patch<ApiResponse<ProjectTask>>(`/projects/${projectId}/tasks/${taskId}`, data);
      return { data: res.data };
    } catch {
      const idx = _tasks.findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        _tasks[idx] = { ..._tasks[idx], ...data } as unknown as ProjectTask;
      }
      const existing = idx !== -1 ? _tasks[idx] : _tasks[0];
      return { data: { success: true, data: { ...existing, ...data } as unknown as ProjectTask } };
    }
  },
  getIssues: async (id: string): Promise<{ data: ApiResponse<TechnicalIssue[]> }> => {
    try {
      const res = await api.get<ApiResponse<TechnicalIssue[]>>(`/projects/${id}/issues`);
      return { data: res.data };
    } catch {
      return { data: { success: true, data: _issues } };
    }
  },
  createIssue: async (id: string, data: Record<string, unknown>): Promise<{ data: ApiResponse<TechnicalIssue> }> => {
    try {
      const res = await api.post<ApiResponse<TechnicalIssue>>(`/projects/${id}/issues`, data);
      return { data: res.data };
    } catch {
      const newItem = {
        id: `mock-issue-${Date.now()}`, project_id: id, title: (data.title as string) || "Mock Issue",
        description: (data.description as string) || null, severity: (data.severity as "critical" | "major" | "minor") ?? "major",
        assigned_to: null, status: "open", resolved_at: null, created_at: new Date().toISOString(),
      } as TechnicalIssue;
      _issues.push(newItem);
      return {
        data: { success: true, data: newItem },
      };
    }
  },
  updateIssue: async (projectId: string, issueId: string, data: Record<string, unknown>): Promise<{ data: ApiResponse<TechnicalIssue> }> => {
    try {
      const res = await api.patch<ApiResponse<TechnicalIssue>>(`/projects/${projectId}/issues/${issueId}`, data);
      return { data: res.data };
    } catch {
      const idx = _issues.findIndex((i) => i.id === issueId);
      if (idx !== -1) {
        _issues[idx] = { ..._issues[idx], ...data } as unknown as TechnicalIssue;
      }
      const existing = idx !== -1 ? _issues[idx] : _issues[0];
      return { data: { success: true, data: { ...existing, ...data } as unknown as TechnicalIssue } };
    }
  },
};

// ---- Design API (with mock fallback) ----

const MOCK_DESIGN_FILES: Record<string, unknown>[] = [
  { id: "df-1", name: "AC-220-EU_PCB_Schematic_v2.1.pdf", type: "schematic", file_size: 2450000, uploaded_by: "user-1", uploaded_at: "2025-05-10T00:00:00Z", product_id: "prod-1", project_id: "proj-1" },
  { id: "df-2", name: "AC-220-EU_BOM_v1.4.xlsx", type: "bom", file_size: 128000, uploaded_by: "user-1", uploaded_at: "2025-05-12T00:00:00Z", product_id: "prod-1", project_id: "proj-1" },
  { id: "df-3", name: "DC-480-US_3D_Model.stp", type: "mechanical", file_size: 15400000, uploaded_by: "user-2", uploaded_at: "2025-05-20T00:00:00Z", product_id: "prod-2", project_id: "proj-2" },
  { id: "df-4", name: "DC-480-US_User_Manual_draft.docx", type: "documentation", file_size: 890000, uploaded_by: "user-2", uploaded_at: "2025-06-01T00:00:00Z", product_id: "prod-2", project_id: "proj-2" },
  { id: "df-5", name: "PF-3.3-JP_Feasibility_Report.pdf", type: "report", file_size: 3200000, uploaded_by: "user-3", uploaded_at: "2025-06-05T00:00:00Z", product_id: "prod-3", project_id: "proj-3" },
  { id: "df-6", name: "AC-110-US_EMC_Test_Report.pdf", type: "test_report", file_size: 5600000, uploaded_by: "user-1", uploaded_at: "2025-05-25T00:00:00Z", product_id: "prod-4", project_id: "proj-4" },
  { id: "df-7", name: "AC-220-EU_Firmware_v1.2.hex", type: "firmware", file_size: 512000, uploaded_by: "user-3", uploaded_at: "2025-06-08T00:00:00Z", product_id: "prod-1", project_id: "proj-1" },
  { id: "df-8", name: "PF-7.7-US_Disassembly_Guide.pdf", type: "documentation", file_size: 1800000, uploaded_by: "user-2", uploaded_at: "2025-02-15T00:00:00Z", product_id: "prod-7", project_id: "proj-7" },
];

let _designFiles = [...MOCK_DESIGN_FILES];

export const designApi = {
  list: async (params?: Record<string, unknown>): Promise<{ data: PaginatedResponse<Record<string, unknown>> }> => {
    try {
      const res = await api.get<PaginatedResponse<Record<string, unknown>>>("/design-files", { params });
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true, data: _designFiles,
          total: _designFiles.length,
          page: (params?.page as number) ?? 1,
          page_size: (params?.page_size as number) ?? 20,
          total_pages: 1,
        },
      };
    }
  },
  get: async (id: string): Promise<{ data: ApiResponse<Record<string, unknown>> }> => {
    try {
      const res = await api.get(`/design-files/${id}`);
      return { data: res.data as unknown as ApiResponse<Record<string, unknown>> };
    } catch {
      const file = _designFiles.find((f) => f.id === id) ?? _designFiles[0];
      return { data: { success: true, data: file } };
    }
  },
  getVersions: async (id: string): Promise<{ data: ApiResponse<Record<string, unknown>[]> }> => {
    try {
      const res = await api.get(`/design-files/${id}/versions`);
      return { data: res.data as unknown as ApiResponse<Record<string, unknown>[]> };
    } catch {
      return {
        data: {
          success: true,
          data: [
            { id: `v1-${id}`, file_id: id, version: "v1", uploaded_by: "user-1", uploaded_at: "2025-04-01T00:00:00Z", file_size: 1200000 },
            { id: `v2-${id}`, file_id: id, version: "v2", uploaded_by: "user-1", uploaded_at: "2025-05-01T00:00:00Z", file_size: 1250000 },
          ],
        },
      };
    }
  },
  download: async (id: string): Promise<{ data: ApiResponse<{ download_url?: string }> }> => {
    try {
      const res = await api.get(`/design-files/${id}/download`);
      return { data: res.data as unknown as ApiResponse<{ download_url?: string }> };
    } catch {
      return { data: { success: true, data: { download_url: "https://mock-storage/design-files/" + id } } };
    }
  },
  delete: async (id: string): Promise<{ data: ApiResponse<{ message: string }> }> => {
    try {
      const res = await api.delete<ApiResponse<{ message: string }>>(`/design-files/${id}`);
      return { data: res.data };
    } catch {
      return { data: { success: true, data: { message: "ok" } } };
    }
  },
  upload: async (formData: FormData): Promise<{ data: ApiResponse<Record<string, unknown>> }> => {
    try {
      const res = await api.post("/design-files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return { data: res.data as unknown as ApiResponse<Record<string, unknown>> };
    } catch {
      const newItem = { id: `mock-upload-${Date.now()}`, name: "uploaded_file", status: "uploaded" };
      _designFiles.push(newItem);
      return { data: { success: true, data: newItem } };
    }
  },
};

// ---- Supplier API (with mock fallback) ----

const MOCK_SUPPLIERS: Supplier[] = [
  { id: "supp-1", name: "Shenzhen PCBA Tech Co., Ltd", type: "pcba_manufacturer", contact_name: "Zhang Wei", contact_email: "zhangwei@pcba-tech.cn", contact_feishu_id: null, qualification_files: null, rating: 4.5, on_time_delivery_rate: 95.0, status: "active", notes: null, created_at: "2024-01-15T00:00:00Z", updated_at: null },
  { id: "supp-2", name: "Foxlink Electronics", type: "cable_assembler", contact_name: "James Liu", contact_email: "james.liu@foxlink.com", contact_feishu_id: null, qualification_files: null, rating: 4.2, on_time_delivery_rate: 88.5, status: "active", notes: "Preferred cable supplier", created_at: "2024-03-01T00:00:00Z", updated_at: null },
  { id: "supp-3", name: "Delta Electronics Inc.", type: "power_module", contact_name: "Emily Chen", contact_email: "emily.chen@delta.com", contact_feishu_id: null, qualification_files: null, rating: 4.8, on_time_delivery_rate: 98.0, status: "active", notes: null, created_at: "2023-11-20T00:00:00Z", updated_at: null },
  { id: "supp-4", name: "Würth Elektronik GmbH", type: "component_distributor", contact_name: "Klaus Schmidt", contact_email: "k.schmidt@we-online.de", contact_feishu_id: null, qualification_files: null, rating: 4.6, on_time_delivery_rate: 93.0, status: "active", notes: null, created_at: "2024-06-10T00:00:00Z", updated_at: null },
  { id: "supp-5", name: "Jabil Circuit Sdn Bhd", type: "ems_provider", contact_name: "Ahmad Razak", contact_email: "ahmad@jabil.my", contact_feishu_id: null, qualification_files: null, rating: 3.9, on_time_delivery_rate: 82.0, status: "suspended", notes: "Quality issues - under review", created_at: "2024-02-15T00:00:00Z", updated_at: "2025-04-01T00:00:00Z" },
  { id: "supp-6", name: "Mitsubishi Electric Components", type: "component_distributor", contact_name: "Takashi Yamamoto", contact_email: "t.yamamoto@mitsu-elec.jp", contact_feishu_id: null, qualification_files: null, rating: 4.7, on_time_delivery_rate: 96.5, status: "active", notes: null, created_at: "2024-09-01T00:00:00Z", updated_at: null },
];

const MOCK_OUTSOURCE_TASKS: Record<string, unknown>[] = [
  { id: "ost-1", supplier_id: "supp-1", project_id: "proj-1", name: "PCBA Prototype Run (100 pcs)", status: "completed", quantity: 100, unit_price: 12.5, total_cost: 1250, started_at: "2025-05-01", completed_at: "2025-05-20", notes: null },
  { id: "ost-2", supplier_id: "supp-1", project_id: "proj-1", name: "PCBA Pre-Production (500 pcs)", status: "in_progress", quantity: 500, unit_price: 11.2, total_cost: 5600, started_at: "2025-06-01", completed_at: null, notes: null },
  { id: "ost-3", supplier_id: "supp-2", project_id: "proj-2", name: "Cable harness assembly (200 units)", status: "pending", quantity: 200, unit_price: 8.75, total_cost: 1750, started_at: null, completed_at: null, notes: "Awaiting material approval" },
  { id: "ost-4", supplier_id: "supp-3", project_id: "proj-1", name: "Power module qualification samples", status: "completed", quantity: 25, unit_price: 250.0, total_cost: 6250, started_at: "2025-04-15", completed_at: "2025-05-10", notes: "All samples passed" },
  { id: "ost-5", supplier_id: "supp-2", project_id: "proj-5", name: "Cable assembly for DC-200-CN", status: "in_progress", quantity: 300, unit_price: 6.5, total_cost: 1950, started_at: "2025-05-20", completed_at: null, notes: null },
  { id: "ost-6", supplier_id: "supp-6", project_id: "proj-10", name: "IGBT module samples", status: "pending", quantity: 50, unit_price: 180.0, total_cost: 9000, started_at: null, completed_at: null, notes: "Lead time 12 weeks" },
];

let _suppliers = [...MOCK_SUPPLIERS];
let _outsourceTasks = [...MOCK_OUTSOURCE_TASKS];

export const supplierApi = {
  list: async (params?: Record<string, unknown>): Promise<{ data: PaginatedResponse<Supplier> }> => {
    try {
      const res = await api.get<PaginatedResponse<Supplier>>("/suppliers", { params });
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true, data: _suppliers,
          total: _suppliers.length,
          page: (params?.page as number) ?? 1,
          page_size: (params?.page_size as number) ?? 20,
          total_pages: 1,
        },
      };
    }
  },
  get: async (id: string): Promise<{ data: ApiResponse<Supplier> }> => {
    try {
      const res = await api.get<ApiResponse<Supplier>>(`/suppliers/${id}`);
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true,
          data: _suppliers.find((s) => s.id === id) ?? {
            id, name: "Mock Supplier", type: "unknown", contact_name: null, contact_email: null,
            contact_feishu_id: null, qualification_files: null, rating: null, on_time_delivery_rate: null,
            status: "active", notes: null, created_at: new Date().toISOString(), updated_at: null,
          } as Supplier,
        },
      };
    }
  },
  create: async (data: Record<string, unknown>): Promise<{ data: ApiResponse<Supplier> }> => {
    try {
      const res = await api.post<ApiResponse<Supplier>>("/suppliers", data);
      return { data: res.data };
    } catch {
      const newItem = {
        id: `mock-supp-${Date.now()}`, name: (data.name as string) || "Mock Supplier",
        type: (data.type as string) || "unknown", contact_name: null, contact_email: null,
        contact_feishu_id: null, qualification_files: null, rating: null, on_time_delivery_rate: null,
        status: "active", notes: null, created_at: new Date().toISOString(), updated_at: null,
      } as Supplier;
      _suppliers.push(newItem);
      return {
        data: { success: true, data: newItem },
      };
    }
  },
  update: async (id: string, data: Record<string, unknown>): Promise<{ data: ApiResponse<Supplier> }> => {
    try {
      const res = await api.patch<ApiResponse<Supplier>>(`/suppliers/${id}`, data);
      return { data: res.data };
    } catch {
      const idx = _suppliers.findIndex((s) => s.id === id);
      if (idx !== -1) {
        _suppliers[idx] = { ..._suppliers[idx], ...data, updated_at: new Date().toISOString() } as unknown as Supplier;
      }
      const existing = idx !== -1 ? _suppliers[idx] : _suppliers[0];
      return { data: { success: true, data: { ...existing, ...data, updated_at: new Date().toISOString() } as unknown as Supplier } };
    }
  },
  delete: async (id: string): Promise<{ data: ApiResponse<{ message: string }> }> => {
    try {
      const res = await api.delete<ApiResponse<{ message: string }>>(`/suppliers/${id}`);
      return { data: res.data };
    } catch {
      return { data: { success: true, data: { message: "ok" } } };
    }
  },
  getOutsourceTasks: async (supplierId: string): Promise<{ data: ApiResponse<Record<string, unknown>[]> }> => {
    try {
      const res = await api.get(`/suppliers/${supplierId}/outsource-tasks`);
      return { data: res.data as unknown as ApiResponse<Record<string, unknown>[]> };
    } catch {
      return { data: { success: true, data: _outsourceTasks.filter((t) => t.supplier_id === supplierId) } };
    }
  },
  createOutsourceTask: async (supplierId: string, data: Record<string, unknown>): Promise<{ data: ApiResponse<Record<string, unknown>> }> => {
    try {
      const res = await api.post(`/suppliers/${supplierId}/outsource-tasks`, data);
      return { data: res.data as unknown as ApiResponse<Record<string, unknown>> };
    } catch {
      const newItem = { id: `mock-ost-${Date.now()}`, supplier_id: supplierId, ...data, status: "pending" };
      _outsourceTasks.push(newItem);
      return { data: { success: true, data: newItem } };
    }
  },
  updateOutsourceTask: async (supplierId: string, taskId: string, data: Record<string, unknown>): Promise<{ data: ApiResponse<Record<string, unknown>> }> => {
    try {
      const res = await api.patch(`/suppliers/${supplierId}/outsource-tasks/${taskId}`, data);
      return { data: res.data as unknown as ApiResponse<Record<string, unknown>> };
    } catch {
      const idx = _outsourceTasks.findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        _outsourceTasks[idx] = { ..._outsourceTasks[idx], ...data };
      }
      return { data: { success: true, data: { id: taskId, supplier_id: supplierId, ...data } } };
    }
  },
  reviewOutsourceTask: async (supplierId: string, taskId: string, data: Record<string, unknown>): Promise<{ data: ApiResponse<Record<string, unknown>> }> => {
    try {
      const res = await api.post(`/suppliers/${supplierId}/outsource-tasks/${taskId}/review`, data);
      return { data: res.data as unknown as ApiResponse<Record<string, unknown>> };
    } catch {
      return { data: { success: true, data: { id: taskId, supplier_id: supplierId, ...data, reviewed_at: new Date().toISOString() } } };
    }
  },
};

// ---- Firmware API (with mock fallback) ----

const MOCK_FIRMWARE_VERSIONS: FirmwareVersion[] = [
  { id: "fw-1", product_model: "AC-220-EU", version: "1.0.0", file_url: "https://mock-storage/fw/ac220/v1.0.0.bin", file_size: 512000, file_hash: "a1b2c3d4", release_notes: "Initial release", release_type: "full", released_by: "user-1", released_at: "2025-01-15T00:00:00Z", created_at: "2025-01-15T00:00:00Z" },
  { id: "fw-2", product_model: "AC-220-EU", version: "1.1.0", file_url: "https://mock-storage/fw/ac220/v1.1.0.bin", file_size: 524000, file_hash: "e5f6g7h8", release_notes: "Bug fixes: OTA stability improvements", release_type: "incremental", released_by: "user-1", released_at: "2025-03-01T00:00:00Z", created_at: "2025-03-01T00:00:00Z" },
  { id: "fw-3", product_model: "DC-480-US", version: "2.0.0", file_url: "https://mock-storage/fw/dc480/v2.0.0.bin", file_size: 768000, file_hash: "i9j0k1l2", release_notes: "Major update: new charging profiles", release_type: "full", released_by: "user-2", released_at: "2025-04-10T00:00:00Z", created_at: "2025-04-10T00:00:00Z" },
  { id: "fw-4", product_model: "DC-480-US", version: "2.0.1", file_url: "https://mock-storage/fw/dc480/v2.0.1.bin", file_size: 772000, file_hash: "m3n4o5p6", release_notes: "Hotfix: input voltage range correction", release_type: "incremental", released_by: "user-2", released_at: "2025-04-20T00:00:00Z", created_at: "2025-04-20T00:00:00Z" },
  { id: "fw-5", product_model: "PF-3.3-JP", version: "0.9.0", file_url: "https://mock-storage/fw/pf33/v0.9.0.bin", file_size: 340000, file_hash: "q7r8s9t0", release_notes: "Beta release for field testing", release_type: "full", released_by: "user-3", released_at: "2025-05-15T00:00:00Z", created_at: "2025-05-15T00:00:00Z" },
  { id: "fw-6", product_model: "AC-110-US", version: "1.0.0", file_url: "https://mock-storage/fw/ac110/v1.0.0.bin", file_size: 498000, file_hash: "u1v2w3x4", release_notes: "Initial release for US market", release_type: "full", released_by: "user-1", released_at: "2025-06-01T00:00:00Z", created_at: "2025-06-01T00:00:00Z" },
];

const MOCK_UPGRADE_TASKS: FirmwareUpgradeTask[] = [
  { id: "ug-1", firmware_version_id: "fw-2", target_sn_filter: { region: "EU" }, gray_scale_percent: 25, status: "in_progress", success_count: 120, failure_count: 3, total_count: 500, failure_reasons: { "TIMEOUT": 2, "CRC_ERROR": 1 }, created_by: "user-1", created_at: "2025-03-10T00:00:00Z", updated_at: "2025-03-15T00:00:00Z" },
  { id: "ug-2", firmware_version_id: "fw-2", target_sn_filter: { region: "EU", batch: "B" }, gray_scale_percent: 50, status: "scheduled", success_count: 0, failure_count: 0, total_count: 1000, failure_reasons: null, created_by: "user-1", created_at: "2025-03-20T00:00:00Z", updated_at: null },
  { id: "ug-3", firmware_version_id: "fw-3", target_sn_filter: null, gray_scale_percent: 10, status: "completed", success_count: 50, failure_count: 0, total_count: 50, failure_reasons: null, created_by: "user-2", created_at: "2025-04-15T00:00:00Z", updated_at: "2025-04-20T00:00:00Z" },
  { id: "ug-4", firmware_version_id: "fw-5", target_sn_filter: { region: "JP" }, gray_scale_percent: 100, status: "failed", success_count: 15, failure_count: 35, total_count: 50, failure_reasons: { "INCOMPATIBLE_HW": 30, "NETWORK_ERROR": 5 }, created_by: "user-3", created_at: "2025-05-20T00:00:00Z", updated_at: "2025-05-25T00:00:00Z" },
];

let _firmwareVersions = [...MOCK_FIRMWARE_VERSIONS];
let _upgradeTasks = [...MOCK_UPGRADE_TASKS];

export const firmwareApi = {
  listVersions: async (params?: Record<string, unknown>): Promise<{ data: PaginatedResponse<FirmwareVersion> }> => {
    try {
      const res = await api.get<PaginatedResponse<FirmwareVersion>>("/firmware/versions", { params });
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true, data: _firmwareVersions,
          total: _firmwareVersions.length,
          page: (params?.page as number) ?? 1,
          page_size: (params?.page_size as number) ?? 20,
          total_pages: 1,
        },
      };
    }
  },
  getVersion: async (id: string): Promise<{ data: ApiResponse<FirmwareVersion> }> => {
    try {
      const res = await api.get<ApiResponse<FirmwareVersion>>(`/firmware/versions/${id}`);
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true,
          data: _firmwareVersions.find((v) => v.id === id) ?? {
            id, product_model: "AC-220-EU", version: "1.0.0", file_url: "", file_size: null,
            file_hash: null, release_notes: null, release_type: "full", released_by: null,
            released_at: new Date().toISOString(), created_at: new Date().toISOString(),
          } as FirmwareVersion,
        },
      };
    }
  },
  createVersion: async (data: Record<string, unknown>): Promise<{ data: ApiResponse<FirmwareVersion> }> => {
    try {
      const res = await api.post<ApiResponse<FirmwareVersion>>("/firmware/versions", data);
      return { data: res.data };
    } catch {
      const newItem = {
        id: `mock-fw-${Date.now()}`, product_model: (data.product_model as string) || "AC-220-EU",
        version: (data.version as string) || "0.0.0", file_url: "", file_size: null, file_hash: null,
        release_notes: (data.release_notes as string) || null, release_type: (data.release_type as "full" | "incremental") ?? "full",
        released_by: "mock-user", released_at: new Date().toISOString(), created_at: new Date().toISOString(),
      } as FirmwareVersion;
      _firmwareVersions.push(newItem);
      return {
        data: { success: true, data: newItem },
      };
    }
  },
  deleteVersion: async (id: string): Promise<{ data: ApiResponse<{ message: string }> }> => {
    try {
      const res = await api.delete<ApiResponse<{ message: string }>>(`/firmware/versions/${id}`);
      return { data: res.data };
    } catch {
      return { data: { success: true, data: { message: "ok" } } };
    }
  },
  uploadFirmware: async (formData: FormData): Promise<{ data: ApiResponse<FirmwareVersion> }> => {
    try {
      const res = await api.post("/firmware/versions/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return { data: res.data as unknown as ApiResponse<FirmwareVersion> };
    } catch {
      const newItem = { id: `mock-upload-${Date.now()}`, product_model: "AC-220-EU", version: "0.0.0", file_url: "", file_size: null, file_hash: null, release_notes: null, release_type: "full", released_by: null, released_at: new Date().toISOString(), created_at: new Date().toISOString() } as FirmwareVersion;
      _firmwareVersions.push(newItem);
      return { data: { success: true, data: newItem } };
    }
  },
  listUpgradeTasks: async (params?: Record<string, unknown>): Promise<{ data: PaginatedResponse<FirmwareUpgradeTask> }> => {
    try {
      const res = await api.get<PaginatedResponse<FirmwareUpgradeTask>>("/firmware/upgrade-tasks", { params });
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true, data: _upgradeTasks,
          total: _upgradeTasks.length,
          page: (params?.page as number) ?? 1,
          page_size: (params?.page_size as number) ?? 20,
          total_pages: 1,
        },
      };
    }
  },
  getUpgradeTask: async (id: string): Promise<{ data: ApiResponse<FirmwareUpgradeTask> }> => {
    try {
      const res = await api.get<ApiResponse<FirmwareUpgradeTask>>(`/firmware/upgrade-tasks/${id}`);
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true,
          data: _upgradeTasks.find((t) => t.id === id) ?? {
            id, firmware_version_id: "fw-1", target_sn_filter: null, gray_scale_percent: 100,
            status: "scheduled", success_count: 0, failure_count: 0, total_count: 0,
            failure_reasons: null, created_by: null, created_at: new Date().toISOString(), updated_at: null,
          } as FirmwareUpgradeTask,
        },
      };
    }
  },
  createUpgradeTask: async (data: Record<string, unknown>): Promise<{ data: ApiResponse<FirmwareUpgradeTask> }> => {
    try {
      const res = await api.post<ApiResponse<FirmwareUpgradeTask>>("/firmware/upgrade-tasks", data);
      return { data: res.data };
    } catch {
      const newItem = {
        id: `mock-ug-${Date.now()}`, firmware_version_id: (data.firmware_version_id as string) || "fw-1",
        target_sn_filter: null, gray_scale_percent: (data.gray_scale_percent as number) ?? 100,
        status: "scheduled", success_count: 0, failure_count: 0, total_count: 0,
        failure_reasons: null, created_by: "mock-user", created_at: new Date().toISOString(), updated_at: null,
      } as FirmwareUpgradeTask;
      _upgradeTasks.push(newItem);
      return {
        data: { success: true, data: newItem },
      };
    }
  },
  updateUpgradeTask: async (id: string, data: Record<string, unknown>): Promise<{ data: ApiResponse<FirmwareUpgradeTask> }> => {
    try {
      const res = await api.patch<ApiResponse<FirmwareUpgradeTask>>(`/firmware/upgrade-tasks/${id}`, data);
      return { data: res.data };
    } catch {
      const idx = _upgradeTasks.findIndex((t) => t.id === id);
      if (idx !== -1) {
        _upgradeTasks[idx] = { ..._upgradeTasks[idx], ...data, updated_at: new Date().toISOString() } as unknown as FirmwareUpgradeTask;
      }
      const existing = idx !== -1 ? _upgradeTasks[idx] : _upgradeTasks[0];
      return { data: { success: true, data: { ...existing, ...data, updated_at: new Date().toISOString() } as unknown as FirmwareUpgradeTask } };
    }
  },
  deleteUpgradeTask: async (id: string): Promise<{ data: ApiResponse<{ message: string }> }> => {
    try {
      const res = await api.delete<ApiResponse<{ message: string }>>(`/firmware/upgrade-tasks/${id}`);
      return { data: res.data };
    } catch {
      return { data: { success: true, data: { message: "ok" } } };
    }
  },
  cancelUpgradeTask: async (id: string): Promise<{ data: ApiResponse<{ message: string }> }> => {
    try {
      const res = await api.post(`/firmware/upgrade-tasks/${id}/cancel`);
      return { data: res.data as unknown as ApiResponse<{ message: string }> };
    } catch {
      return { data: { success: true, data: { message: "ok" } } };
    }
  },
};

// ---- Admin API (with mock fallback) ----

export const adminApi = {
  listUsers: async (params?: Record<string, unknown>): Promise<{ data: PaginatedResponse<User> }> => {
    try {
      const res = await api.get<PaginatedResponse<User>>("/admin/users", { params });
      return { data: res.data };
    } catch {
      const { buildMockUsers } = await import("./__mocks__/admin");
      return { data: buildMockUsers(params) };
    }
  },
  createUser: async (data: Record<string, unknown>): Promise<{ data: ApiResponse<User> }> => {
    try {
      const res = await api.post<ApiResponse<User>>("/admin/users", data);
      return { data: res.data };
    } catch {
      const { addMockUser } = await import("./__mocks__/admin");
      return {
        data: {
          success: true,
          data: addMockUser(data),
        },
      };
    }
  },
  updateUser: async (id: string, data: Record<string, unknown>): Promise<{ data: ApiResponse<User> }> => {
    try {
      const res = await api.patch<ApiResponse<User>>(`/admin/users/${id}`, data);
      return { data: res.data };
    } catch {
      const { updateMockUser } = await import("./__mocks__/admin");
      const updated = updateMockUser(id, data);
      return { data: { success: true, data: updated || (data as unknown as User) } };
    }
  },
  deleteUser: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/admin/users/${id}`),
  getAuditLogs: async (params?: Record<string, unknown>): Promise<{ data: PaginatedResponse<Record<string, unknown>> }> => {
    try {
      const res = await api.get<PaginatedResponse<Record<string, unknown>>>("/admin/audit-logs", { params });
      return { data: res.data };
    } catch {
      const { buildMockAuditLogs } = await import("./__mocks__/admin");
      return { data: buildMockAuditLogs(params) };
    }
  },
};

// ---- Certification API (with mock fallback) ----

const MOCK_CERTIFICATIONS: Certification[] = [
  { id: "cert-1", product_id: "prod-1", cert_type: "CE", cert_number: "CE-2025-001-AC220", issued_by: "TÜV Rheinland", issue_date: "2025-03-01", expiry_date: "2028-03-01", cert_file_url: null, status: "valid", remind_before_days: 90, created_at: "2025-03-01T00:00:00Z", updated_at: null },
  { id: "cert-2", product_id: "prod-1", cert_type: "ROHS", cert_number: "RoHS-2025-0042", issued_by: "SGS", issue_date: "2025-02-15", expiry_date: "2026-02-15", cert_file_url: null, status: "valid", remind_before_days: 60, created_at: "2025-02-15T00:00:00Z", updated_at: null },
  { id: "cert-3", product_id: "prod-2", cert_type: "UL", cert_number: "UL-E483921", issued_by: "Underwriters Laboratories", issue_date: "2025-04-10", expiry_date: "2028-04-10", cert_file_url: null, status: "valid", remind_before_days: 90, created_at: "2025-04-10T00:00:00Z", updated_at: null },
  { id: "cert-4", product_id: "prod-2", cert_type: "FCC", cert_number: "FCC-ID: 2A9HR-DC480", issued_by: "FCC", issue_date: "2025-04-15", expiry_date: "2028-04-15", cert_file_url: null, status: "valid", remind_before_days: 90, created_at: "2025-04-15T00:00:00Z", updated_at: null },
  { id: "cert-5", product_id: "prod-3", cert_type: "PSE", cert_number: "PSE-JP-2025-0331", issued_by: "JET", issue_date: "2025-05-20", expiry_date: "2025-08-20", cert_file_url: null, status: "expiring_soon", remind_before_days: 60, created_at: "2025-05-20T00:00:00Z", updated_at: null },
  { id: "cert-6", product_id: "prod-4", cert_type: "UL", cert_number: "UL-E491032", issued_by: "Underwriters Laboratories", issue_date: "2025-03-01", expiry_date: "2025-07-01", cert_file_url: null, status: "expiring_soon", remind_before_days: 30, created_at: "2025-03-01T00:00:00Z", updated_at: null },
  { id: "cert-7", product_id: "prod-5", cert_type: "CCC", cert_number: "CCC-2024-11223", issued_by: "CQC", issue_date: "2024-12-01", expiry_date: "2025-06-15", cert_file_url: null, status: "expiring_soon", remind_before_days: 45, created_at: "2024-12-01T00:00:00Z", updated_at: null },
  { id: "cert-8", product_id: "prod-8", cert_type: "CE", cert_number: "CE-2023-001-DC1500", issued_by: "TÜV SÜD", issue_date: "2023-10-01", expiry_date: "2024-10-01", cert_file_url: null, status: "expired", remind_before_days: 90, created_at: "2023-10-01T00:00:00Z", updated_at: "2024-10-02T00:00:00Z" },
];

let _certifications = [...MOCK_CERTIFICATIONS];

export const certApi = {
  list: async (params?: Record<string, unknown>): Promise<{ data: PaginatedResponse<Certification> }> => {
    try {
      const res = await api.get<PaginatedResponse<Certification>>("/certifications", { params });
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true, data: _certifications,
          total: _certifications.length,
          page: (params?.page as number) ?? 1,
          page_size: (params?.page_size as number) ?? 20,
          total_pages: 1,
        },
      };
    }
  },
  get: async (id: string): Promise<{ data: ApiResponse<Certification> }> => {
    try {
      const res = await api.get<ApiResponse<Certification>>(`/certifications/${id}`);
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true,
          data: _certifications.find((c) => c.id === id) ?? {
            id, product_id: "prod-1", cert_type: "Mock Cert", cert_number: null, issued_by: null,
            issue_date: null, expiry_date: null, cert_file_url: null, status: "valid",
            remind_before_days: 90, created_at: new Date().toISOString(), updated_at: null,
          } as Certification,
        },
      };
    }
  },
  create: async (data: Record<string, unknown>): Promise<{ data: ApiResponse<Certification> }> => {
    try {
      const res = await api.post<ApiResponse<Certification>>("/certifications", data);
      return { data: res.data };
    } catch {
      const newItem = {
        id: `mock-cert-${Date.now()}`, product_id: (data.product_id as string) || "prod-1",
        cert_type: (data.cert_type as string) || "CE", cert_number: null, issued_by: null,
        issue_date: null, expiry_date: null, cert_file_url: null, status: "valid",
        remind_before_days: 90, created_at: new Date().toISOString(), updated_at: null,
      } as Certification;
      _certifications.push(newItem);
      return {
        data: { success: true, data: newItem },
      };
    }
  },
  update: async (id: string, data: Record<string, unknown>): Promise<{ data: ApiResponse<Certification> }> => {
    try {
      const res = await api.patch<ApiResponse<Certification>>(`/certifications/${id}`, data);
      return { data: res.data };
    } catch {
      const idx = _certifications.findIndex((c) => c.id === id);
      if (idx !== -1) {
        _certifications[idx] = { ..._certifications[idx], ...data, updated_at: new Date().toISOString() } as unknown as Certification;
      }
      const existing = idx !== -1 ? _certifications[idx] : _certifications[0];
      return { data: { success: true, data: { ...existing, ...data, updated_at: new Date().toISOString() } as unknown as Certification } };
    }
  },
  delete: async (id: string): Promise<{ data: ApiResponse<{ message: string }> }> => {
    try {
      const res = await api.delete<ApiResponse<{ message: string }>>(`/certifications/${id}`);
      return { data: res.data };
    } catch {
      return { data: { success: true, data: { message: "ok" } } };
    }
  },
  expiring: async (days: number = 90): Promise<{ data: ApiResponse<Certification[]> }> => {
    try {
      const res = await api.get<ApiResponse<Certification[]>>("/certifications/expiring/list", { params: { days } });
      return { data: res.data };
    } catch {
      return {
        data: {
          success: true,
          data: _certifications.filter((c) => c.status === "expiring_soon" || c.status === "expired").slice(0, 3),
        },
      };
    }
  },
};

// ---- Analytics API ----

export const analyticsApi = {
  getOverview: () => api.get<ApiResponse<AnalyticsOverview>>("/analytics/overview"),
  getTrends: () => api.get<ApiResponse<TrendPoint[]>>("/analytics/trends"),
  getTaskStats: () => api.get<ApiResponse<TaskStats>>("/analytics/task-stats"),
  getIssueDistribution: () =>
    api.get<ApiResponse<IssueDistribution[]>>("/analytics/issue-distribution"),

  /** Get lifecycle per-stage analytics (real API + mock fallback) */
  getLifecycleAnalytics: async (): Promise<ApiResponse<LifecycleAnalyticsData>> => {
    try {
      const res = await api.get<ApiResponse<LifecycleAnalyticsData>>("/analytics/lifecycle");
      return res.data;
    } catch {
      // Backend endpoint TBD — return mock data as fallback
      const { buildMockLifecycleAnalyticsData } = await import("./__mocks__/lifecycleAnalytics");
      return { success: true, data: buildMockLifecycleAnalyticsData() };
    }
  },
};
