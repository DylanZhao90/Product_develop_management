# PDM System — Entity-Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              users                                        │
│  id (UUID PK)  │  feishu_open_id  │  name  │  email  │  role  │  is_active│
│  supplier_id (FK→suppliers)  │  language_pref  │  created_at             │
└──────┬───────────────────────────────────────────────────────────────────┘
       │
       │ (product_manager_id — logical reference, no FK constraint)
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                             products                                      │
│  id (UUID PK)  │  code (UNIQUE, e.g. AC-2026-0001)                       │
│  model  │  name  │  type (ac/dc/portable)  │  lifecycle_status           │
│  target_markets (JSONB)  │  certification_requirements (JSONB)           │
│  product_manager_id  │  description  │  created_at  │  updated_at        │
└──┬───────┬──────────┬──────────┬─────────────────────────────────────────┘
   │       │          │          │
   │       │          │          └──► projects (1:N)
   │       │          │                id │ product_id (FK) │ name │ type
   │       │          │                status │ approval_id │ feishu_chat_id
   │       │          │                created_by │ created_at
   │       │          │                     │
   │       │          │          ┌──────────┼──────────┐
   │       │          │          ▼          ▼          ▼
   │       │          │    project_tasks   technical_issues
   │       │          │    (self-ref FK     (project_id FK)
   │       │          │     parent_task_id)
   │       │          │
   │       │          └──► design_files (1:N)
   │       │                id │ product_id (FK) │ file_name │ version
   │       │                file_url (MinIO key) │ is_current │ uploaded_by
   │       │
   │       ├──► lifecycle_change_logs (1:N)
   │       │     id │ product_id (FK) │ from_status │ to_status
   │       │     approval_id │ changed_by │ reason │ changed_at
   │       │
   │       └──► certifications (1:N)
   │             id │ product_id (FK) │ cert_type │ cert_number
   │             issued_by │ issue_date │ expiry_date │ status
   │             remind_before_days
   │
   └──► firmware_upgrade_tasks ◄── firmware_versions
         (FK: firmware_version_id)    id │ product_model │ version
         target_sn_filter (JSONB)     file_url │ file_hash │ release_type
         gray_scale_percent │ status  released_by │ released_at
         success/failure/total_count

┌──────────────────────────────────────────────────────────────────────────┐
│                             suppliers                                      │
│  id (UUID PK)  │  name  │  type  │  contact_name  │  contact_email       │
│  contact_feishu_id  │  qualification_files (JSONB)  │  rating            │
│  on_time_delivery_rate  │  status (active/suspended/blacklisted)         │
└──┬───────────────────────────────────────────────────────────────────────┘
   │
   └──► outsource_tasks (1:N)
         id │ supplier_id (FK) │ project_task_id (FK, nullable)
         title │ rfq_url │ quotation_amount │ deliverable_urls (JSONB)
         review_status (pending_review/approved/rejected)

┌──────────────────────────────────────────────────────────────────────────┐
│                            audit_logs                                      │
│  id (UUID PK)  │  user_id  │  action  │  resource_type  │  resource_id   │
│  old_value (JSONB)  │  new_value (JSONB)  │  ip_address  │  user_agent   │
│  duration_ms  │  created_at                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

## Key Relationships

| Relationship | Type | On Delete |
|-------------|------|-----------|
| products → lifecycle_change_logs | 1:N | CASCADE |
| products → design_files | 1:N | CASCADE |
| products → certifications | 1:N | CASCADE |
| products → projects | 1:N | RESTRICT |
| projects → project_tasks | 1:N | CASCADE |
| projects → technical_issues | 1:N | CASCADE |
| project_tasks → project_tasks (parent) | Self-ref | SET NULL |
| suppliers → outsource_tasks | 1:N | RESTRICT |
| project_tasks → outsource_tasks | 1:1 | SET NULL |
| firmware_versions → firmware_upgrade_tasks | 1:N | RESTRICT |

## Composite Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| projects | (product_id, status) | Dashboard + product detail |
| project_tasks | (project_id, status) | Project detail + task stats |
| certifications | (product_id, status) | Product detail + expiry check |
| certifications | (expiry_date) | Expiry scheduler |
| products | (type, lifecycle_status) | Product list filtering |
| firmware_upgrade_tasks | (firmware_version_id, status) | Firmware task list |
| audit_logs | (resource_type, resource_id, created_at) | Admin audit log view |
