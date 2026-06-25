// ============================================
// PDM Frontend — API Type Definitions
// ============================================

// ---- Generic API Response wrapper ----

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ---- Product ----

export type ProductType = "ac_charger" | "dc_charger" | "portable";
export type LifecycleStatus = "in_development" | "trial_handover" | "on_sale" | "discontinued" | "eol";

export interface Product {
  id: string;
  project_id: string;
  code: string;
  model: string;
  name: string;
  type: ProductType | null;
  power?: string | null;
  target_markets: string[] | null;
  certification_requirements: string[] | null;
  lifecycle_status: LifecycleStatus;
  product_manager_id: string | null;
  thumbnail_url: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductCreate {
  project_id: string;
  model: string;
  name: string;
  type?: ProductType;
  power?: string;
  target_markets?: string[];
  certification_requirements?: string[];
  description?: string;
}

export interface ProductUpdate {
  model?: string;
  name?: string;
  type?: ProductType;
  project_id?: string;
  target_markets?: string[];
  certification_requirements?: string[];
  description?: string;
  product_manager_id?: string;
}

// ---- Project ----

export type ProjectStatus = "pending_approval" | "approved" | "in_progress" | "completed" | "closed";
export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";
export type IssueSeverity = "critical" | "major" | "minor";
export type IssueStatus = "open" | "investigating" | "resolved" | "closed";

export interface Project {
  id: string;
  product_id?: string;
  product_code?: string;
  supplier_id?: string;
  supplier_name?: string;
  name: string;
  type: string;
  project_type_key: string;
  approval_status: 'draft' | 'pending' | 'approved' | 'rejected';
  approval_flow_id: string | null;
  feasibility_doc_url: string | null;
  approval_id: string | null;
  feishu_chat_id: string | null;
  status: ProjectStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ProjectCreate {
  name: string;
  type?: "new_product" | "version_upgrade";
  project_type_key: string;
  product_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  owner?: string;
  feasibility_doc_url?: string | null;
}

export interface ProjectTypeConfig {
  id: string;
  type_key: string;  // "new_product" | "version_upgrade" | "certification" | "other"
  display_name: Record<string, string>;  // {"zh-CN":"新产品研发","en-US":"New Product"}
  sort_order: number;
  is_active: boolean;
  requires_approval: boolean;  // true=需审批流，false=创建后直接进入 in_progress
}

export interface ProjectTask {
  id: string;
  project_id: string;
  parent_task_id: string | null;
  name: string;
  responsible_role: string | null;
  assignee_feishu_id: string | null;
  supplier_id: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_end: string | null;
  deliverables: Record<string, unknown> | null;
  status: TaskStatus;
  sort_order: number;
  children?: ProjectTask[];
}

export interface TechnicalIssue {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  severity: IssueSeverity;
  assigned_to: string | null;
  status: IssueStatus;
  resolved_at: string | null;
  created_at: string;
}

// ---- Supplier ----

export type SupplierStatus = "active" | "suspended" | "blacklisted";

export interface Supplier {
  id: string;
  name: string;
  type: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_feishu_id: string | null;
  qualification_files: string[] | null;
  rating: number | null;
  on_time_delivery_rate: number | null;
  status: SupplierStatus;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface SupplierProfile {
  id: string;
  name: string;
  type: string;  // "pcba_manufacturer" | "cable_assembler" | "power_module" | "component_distributor" | "ems_provider" | ...
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  country: string | null;
  qualification_files: string[] | null;
  rating: number | null;       // 综合评分 1-5
  on_time_delivery_rate: number | null;  // 准时交付率 0-100
  quality_pass_rate: number | null;     // 质量合格率 0-100（新增）
  health_score: number | null;          // 综合健康度 0-100（由 rating×delivery×quality 加权计算）
  status: SupplierStatus;
  current_phase: string | null;  // 当前所处的生命周期阶段 project_type_key
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

// ---- Certification ----

export type CertStatus = "valid" | "expiring_soon" | "expired";

export interface Certification {
  id: string;
  product_id: string;
  cert_type: string;
  cert_number: string | null;
  issued_by: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  cert_file_url: string | null;
  status: CertStatus;
  remind_before_days: number;
  created_at: string;
  updated_at: string | null;
}

// ---- Firmware ----

export type ReleaseType = "full" | "incremental";
export type UpgradeTaskStatus = "scheduled" | "in_progress" | "completed" | "failed";

export interface FirmwareVersion {
  id: string;
  product_model: string;
  version: string;
  file_url: string;
  file_size: number | null;
  file_hash: string | null;
  release_notes: string | null;
  release_type: ReleaseType;
  released_by: string | null;
  released_at: string;
  created_at: string;
}

export interface FirmwareUpgradeTask {
  id: string;
  firmware_version_id: string;
  target_sn_filter: Record<string, unknown> | null;
  gray_scale_percent: number;
  status: UpgradeTaskStatus;
  success_count: number;
  failure_count: number;
  total_count: number;
  failure_reasons: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

// ---- Auth ----

export interface User {
  id: string;
  feishu_open_id: string | null;
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: string;
  supplier_id: string | null;
  language_pref: string;
  is_active: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface AuthLoginUrl {
  auth_url: string;
  state: string;
}

// ---- Dashboard / Analytics ----

export interface DashboardStats {
  active_products: number;
  active_projects: number;
  pending_tasks: number;
  completed_tasks: number;
  recent_projects: Array<{ id: string; name: string; status: string; created_at: string | null }>;
  recent_tasks: Array<{ id: string; name: string; status: string; created_at: string | null }>;
}

export interface AnalyticsOverview {
  products_by_status: Record<string, number>;
  projects_by_status: Record<string, number>;
}

export interface TaskStats {
  total: number;
  completed: number;
  blocked: number;
  pending: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface IssueDistribution {
  severity: string;
  count: number;
}

// ---- Lifecycle Analytics ----

export interface LifecycleStageEntry {
  month: string;
  count: number;
}

export interface LifecycleStageProduct {
  code: string;
  name: string;
  model: string;
  entered_at: string;
  duration_days: number;
  markets?: string[];
}

export interface LifecycleStageAnalytics {
  stage: LifecycleStatus;
  count: number;
  entries: LifecycleStageEntry[];
  duration_distribution: { range: string; count: number }[];
  products: LifecycleStageProduct[];
}

export interface LifecycleFlowData {
  from: LifecycleStatus;
  to: LifecycleStatus;
  count: number;
}

export interface LifecycleAnalyticsData {
  in_development: LifecycleStageAnalytics;
  trial_handover: LifecycleStageAnalytics;
  on_sale: LifecycleStageAnalytics;
  discontinued: LifecycleStageAnalytics;
  eol: LifecycleStageAnalytics;
  flows: LifecycleFlowData[];
  total_products: number;
}

// ---- Lifecycle ----

export interface LifecycleChangeLog {
  id: string;
  product_id: string;
  from_status: string;
  to_status: string;
  approval_id: string | null;
  changed_by: string | null;
  reason: string | null;
  changed_at: string | null;
}

export interface LifecycleTransition {
  to_status: LifecycleStatus;
  reason?: string;
}

// ---- Approval Flow ----

export interface ApprovalTemplate {
  id: string
  name: string  // "新产品审批流" / "迭代审批流"
  project_type_key: string
  nodes: ApprovalNodeDef[]
  is_active: boolean
  created_at: string
}

export interface ApprovalNodeDef {
  id: string
  order: number
  node_name: string  // "项目经理审批", "技术总监审批", "总经理审批"
  approver_role: string  // "pm" | "tech_director" | "general_manager"
  can_skip: boolean
}

export interface ApprovalFlowInstance {
  id: string
  project_id: string
  template_id: string
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  current_node_order: number
  created_at: string
  updated_at: string
}

export interface ApprovalRecord {
  id: string
  flow_id: string
  node_order: number
  node_name: string
  approver_name: string
  action: 'approve' | 'reject' | 'return' | 'pending'
  comment: string
  created_at: string
}
