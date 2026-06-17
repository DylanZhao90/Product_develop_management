/**
 * useDashboardLayout — dashboard layout state management
 * Persists widget order, visibility, and pin state to localStorage.
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface WidgetConfig {
  id: string;
  titleKey: string;
  defaultTitle: string;
  visible: boolean;
  pinned: boolean;
  defaultSpan: 12 | 24; // Ant Design Col span
}

export interface LayoutState {
  widgets: WidgetConfig[];
  order: string[];
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const LAYOUT_KEY = "pdm_dashboard_layout";

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "panorama", titleKey: "dashboard.lifecyclePanorama", defaultTitle: "生命周期全景", visible: true, pinned: false, defaultSpan: 24 },
  { id: "lifecycle", titleKey: "dashboard.lifecycleChart", defaultTitle: "产品生命周期分布", visible: true, pinned: false, defaultSpan: 12 },
  { id: "progress",  titleKey: "dashboard.progressChart",   defaultTitle: "项目进度看板",   visible: true, pinned: false, defaultSpan: 12 },
  { id: "activity",  titleKey: "dashboard.recentActivity",  defaultTitle: "最近动态",       visible: true, pinned: false, defaultSpan: 24 },
  { id: "products",  titleKey: "menu.products",             defaultTitle: "产品列表",       visible: true, pinned: false, defaultSpan: 24 },
];

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

export function loadLayout(): LayoutState {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) return JSON.parse(raw) as LayoutState;
  } catch {
    // ignore parse errors
  }
  return {
    widgets: DEFAULT_WIDGETS.map((w) => ({ ...w })),
    order: DEFAULT_WIDGETS.map((w) => w.id),
  };
}

export function saveLayout(layout: LayoutState) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}
