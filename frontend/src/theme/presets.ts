/**
 * PDM Theme Presets — 5 complete design systems.
 *
 * Each preset is self-contained: colors, Ant Design global tokens,
 * component-specific tokens, and algorithm (light/dark).
 */

import type { ThemeConfig } from "antd";

// ═══════════════════════════════════════════════════════════════
// Type
// ═══════════════════════════════════════════════════════════════

export interface ThemePreset {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  /** "default" = light mode, "dark" = Ant Design darkAlgorithm */
  mode: "default" | "dark";
  colors: {
    primary: Record<string, string>;
    neutral: Record<string, string>;
    success: Record<string, string>;
    warning: Record<string, string>;
    error: Record<string, string>;
    info: Record<string, string>;
  };
  antdTokens: ThemeConfig["token"];
  componentTokens: ThemeConfig["components"];
  /** CSS custom properties injected on :root */
  cssVariables: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════
// Helper — build a full preset from a compact color scheme
// ═══════════════════════════════════════════════════════════════

function buildPreset(cfg: {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  mode: "default" | "dark";
  primary: Record<string, string>;
  neutral: Record<string, string>;
  success: Record<string, string>;
  warning: Record<string, string>;
  error: Record<string, string>;
  info: Record<string, string>;
  sidebarBg: string;
}): ThemePreset {
  const { primary, neutral, success, warning, error, info, sidebarBg } = cfg;

  return {
    id: cfg.id,
    name: cfg.name,
    nameZh: cfg.nameZh,
    description: cfg.description,
    mode: cfg.mode,

    colors: { primary, neutral, success, warning, error, info },

    // ── Global Ant Design tokens ──
    antdTokens: {
      colorPrimary: primary[500],
      colorPrimaryBg: primary[50],
      colorPrimaryBgHover: primary[100],
      colorPrimaryBorder: primary[300],
      colorPrimaryBorderHover: primary[400],
      colorPrimaryHover: primary[600],
      colorPrimaryActive: primary[700],
      colorPrimaryTextHover: primary[600],

      colorSuccess: success[500],
      colorSuccessBg: success[50],
      colorWarning: warning[500],
      colorWarningBg: warning[50],
      colorError: error[500],
      colorErrorBg: error[50],
      colorInfo: info[500],
      colorInfoBg: info[50],

      colorTextBase: neutral[700],
      colorText: neutral[700],
      colorTextSecondary: neutral[500],
      colorTextTertiary: neutral[400],
      colorTextQuaternary: neutral[300],

      colorBgBase: neutral[0],
      colorBgContainer: neutral[0],
      colorBgLayout: neutral[50],
      colorBgElevated: neutral[0],
      colorBgSpotlight: neutral[800],

      colorBorder: neutral[200],
      colorBorderSecondary: neutral[100],
      colorSplit: neutral[100],
      colorFill: neutral[100],
      colorFillSecondary: neutral[50],
      colorFillTertiary: neutral[0],
      colorFillQuaternary: neutral[0],

      fontFamily: `-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", "Noto Sans SC", "PingFang SC", sans-serif`,
      fontFamilyCode: `"JetBrains Mono", "SF Mono", "Cascadia Code", Consolas, monospace`,
      fontSize: 14,
      lineHeight: 1.5714,

      borderRadius: 8,
      borderRadiusLG: 12,
      borderRadiusSM: 6,
      borderRadiusXS: 4,

      boxShadow: `0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02)`,
      boxShadowSecondary: `0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.06)`,
      boxShadowTertiary: `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)`,

      motionDurationSlow: "0.3s",
      motionDurationMid: "0.2s",
      motionDurationFast: "0.1s",
      motionEaseInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      motionEaseOut: "cubic-bezier(0, 0, 0.2, 1)",

      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      padding: 16,
      paddingLG: 24,
      paddingXS: 8,
      margin: 16,
      marginLG: 24,

      wireframe: false,
    },

    // ── Component-specific tokens ──
    componentTokens: {
      Layout: {
        siderBg: sidebarBg,
        triggerBg: neutral[800],
        triggerColor: neutral[300],
      },
      Menu: {
        darkItemBg: sidebarBg,
        darkItemColor: neutral[400],
        darkItemHoverBg: `${primary[500]}26`,
        darkItemHoverColor: neutral[0],
        darkItemSelectedBg: `${primary[500]}38`,
        darkItemSelectedColor: neutral[0],
        darkSubMenuItemBg: sidebarBg,
        darkItemDisabledColor: neutral[600],
        itemBorderRadius: 8,
        itemMarginInline: 8,
      },
      Table: {
        headerBg: neutral[50],
        headerColor: neutral[500],
        headerSplitColor: "transparent",
        rowHoverBg: primary[50],
        borderColor: neutral[100],
        cellPaddingBlock: 12,
        cellPaddingInline: 16,
      },
      Card: {
        paddingLG: 24,
        borderRadiusLG: 12,
      },
      Button: {
        borderRadius: 8,
        controlHeight: 36,
        controlHeightLG: 44,
        controlHeightSM: 28,
        paddingInline: 16,
        paddingInlineLG: 20,
        paddingInlineSM: 12,
      },
      Input: {
        borderRadius: 8,
        controlHeight: 36,
        controlHeightLG: 44,
        controlHeightSM: 28,
      },
      Tag: { borderRadiusSM: 6 },
      Modal: { borderRadiusLG: 16, titleFontSize: 18 },
      Statistic: { titleFontSize: 14, contentFontSize: 28 },
      Breadcrumb: {
        fontSize: 14,
        linkColor: neutral[500],
        linkHoverColor: primary[500],
        separatorColor: neutral[300],
      },
      DatePicker: {
        borderRadius: 8,
        controlHeight: 36,
        controlHeightLG: 44,
        controlHeightSM: 28,
      },
      Select: {
        borderRadius: 8,
        controlHeight: 36,
        controlHeightLG: 44,
        controlHeightSM: 28,
        optionSelectedBg: primary[50],
        optionSelectedColor: primary[700],
      },
      Tabs: {
        itemColor: neutral[500],
        itemHoverColor: primary[500],
        itemSelectedColor: primary[500],
        itemActiveColor: primary[500],
        inkBarColor: primary[500],
      },
      Badge: { dotSize: 8, textFontSize: 12 },
      Tooltip: { borderRadius: 8, colorBgSpotlight: neutral[800] },
      Popover: { borderRadius: 12 },
      Progress: {
        defaultColor: primary[500],
        remainingColor: neutral[100],
        borderRadius: 4,
      },
      Switch: { trackHeightSM: 16, trackHeight: 22, handleSizeSM: 12, handleSize: 18 },
      Radio: {
        radioSize: 16,
        dotSize: 8,
        buttonSolidCheckedBg: primary[500],
        buttonSolidCheckedColor: neutral[0],
        buttonSolidCheckedHoverBg: primary[600],
      },
      Notification: { borderRadiusLG: 12 },
      Upload: { borderRadiusLG: 12 },
      Collapse: {
        borderRadiusLG: 8,
        headerBg: neutral[0],
        contentBg: neutral[0],
      },
    },

    // ── CSS custom properties (injected on :root) ──
    cssVariables: {
      "--color-primary": primary[500],
      "--color-primary-hover": primary[700],
      "--color-primary-bg": `${primary[500]}14`,
      "--color-primary-border": `${primary[500]}4D`,

      "--color-sidebar-bg": sidebarBg,
      "--color-sidebar-hover": `${primary[500]}1F`,
      "--color-sidebar-active": `${primary[500]}38`,

      "--color-success": success[500],
      "--color-warning": warning[500],
      "--color-error": error[500],

      "--color-bg-page": neutral[50],
      "--color-bg-card": neutral[0],
      "--color-border": neutral[200],
      "--color-border-light": neutral[100],

      "--color-text": neutral[700],
      "--color-text-secondary": neutral[500],
      "--color-text-muted": neutral[400],

      "--radius-sm": "6px",
      "--radius-md": "8px",
      "--radius-lg": "12px",
      "--radius-xl": "16px",
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// 5 Theme Presets
// ═══════════════════════════════════════════════════════════════

export const themePresets: ThemePreset[] = [
  // ── 1. Tech SaaS (default) ─────────────────────────────────
  buildPreset({
    id: "tech-saas",
    name: "Tech SaaS",
    nameZh: "科技蓝紫",
    description: "Modern, glass-morphism header, dark sidebar, tech-forward",
    mode: "default",
    primary: {
      50: "#f0f5ff", 100: "#d6e4ff", 200: "#adc6ff", 300: "#85a5ff",
      400: "#6b85f8", 500: "#4f6ef6", 600: "#4058db", 700: "#3b4fcf",
      800: "#2d3fa8", 900: "#1e2f8a",
    },
    neutral: {
      0: "#ffffff", 50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0",
      300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b", 600: "#475569",
      700: "#334155", 800: "#1e293b", 900: "#0f172a",
    },
    success: { 50: "#f0fdf4", 500: "#22c55e", 700: "#16a34a" },
    warning: { 50: "#fffbeb", 500: "#f59e0b", 700: "#d97706" },
    error: { 50: "#fef2f2", 500: "#ef4444", 700: "#dc2626" },
    info: { 50: "#eef2ff", 500: "#6366f1", 700: "#4f46e5" },
    sidebarBg: "#0f172a",
  }),

  // ── 2. Linear Dark ─────────────────────────────────────────
  buildPreset({
    id: "linear-dark",
    name: "Linear Dark",
    nameZh: "Linear 暗色",
    description: "Full dark mode, green accents, minimalist — inspired by Linear",
    mode: "dark",
    primary: {
      50: "#eef7f0", 100: "#d3ece0", 200: "#a6d9c1", 300: "#79c7a2",
      400: "#4db483", 500: "#1ea864", 600: "#198f54", 700: "#147644",
      800: "#0f5d34", 900: "#0a4424",
    },
    neutral: {
      0: "#1a1a1a", 50: "#212121", 100: "#2a2a2a", 200: "#333333",
      300: "#4a4a4a", 400: "#6b6b6b", 500: "#8c8c8c", 600: "#a3a3a3",
      700: "#cccccc", 800: "#e0e0e0", 900: "#f5f5f5",
    },
    success: { 50: "#0d2818", 500: "#39d353", 700: "#5ce670" },
    warning: { 50: "#2d1f0a", 500: "#f0a030", 700: "#f4b950" },
    error: { 50: "#2d0f0f", 500: "#f85149", 700: "#fa6e67" },
    info: { 50: "#0d1d2d", 500: "#58a6ff", 700: "#79b8ff" },
    sidebarBg: "#141414",
  }),

  // ── 3. Forest Emerald ──────────────────────────────────────
  buildPreset({
    id: "forest-emerald",
    name: "Forest Emerald",
    nameZh: "自然翡翠",
    description: "Nature-inspired greens, eye-friendly, warm and humanized",
    mode: "default",
    primary: {
      50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7",
      400: "#34d399", 500: "#059669", 600: "#047857", 700: "#065f46",
      800: "#064e3b", 900: "#022c22",
    },
    neutral: {
      0: "#ffffff", 50: "#f6f9f7", 100: "#eef2ef", 200: "#dce4df",
      300: "#bfc9c3", 400: "#8f9c93", 500: "#5f6d64", 600: "#445249",
      700: "#2d3831", 800: "#1a241d", 900: "#0f1a14",
    },
    success: { 50: "#ecfdf5", 500: "#10b981", 700: "#047857" },
    warning: { 50: "#fffbeb", 500: "#d97706", 700: "#b45309" },
    error: { 50: "#fef2f2", 500: "#dc2626", 700: "#b91c1c" },
    info: { 50: "#eef2ff", 500: "#6366f1", 700: "#4f46e5" },
    sidebarBg: "#0f1a14",
  }),

  // ── 4. Sunset Amber ────────────────────────────────────────
  buildPreset({
    id: "sunset-amber",
    name: "Sunset Amber",
    nameZh: "日落琥珀",
    description: "Warm amber tones, creative energy, approachable feel",
    mode: "default",
    primary: {
      50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d",
      400: "#fbbf24", 500: "#d97706", 600: "#b45309", 700: "#92400e",
      800: "#78350f", 900: "#451a03",
    },
    neutral: {
      0: "#ffffff", 50: "#fdfaf5", 100: "#f8f3ea", 200: "#efe4d4",
      300: "#dfceb5", 400: "#b8a088", 500: "#8c6f56", 600: "#6b5340",
      700: "#4a382b", 800: "#2d2118", 900: "#1c1410",
    },
    success: { 50: "#ecfdf5", 500: "#10b981", 700: "#047857" },
    warning: { 50: "#fff7ed", 500: "#ea580c", 700: "#c2410c" },
    error: { 50: "#fef2f2", 500: "#dc2626", 700: "#b91c1c" },
    info: { 50: "#eef2ff", 500: "#6366f1", 700: "#4f46e5" },
    sidebarBg: "#1c1410",
  }),

  // ── 5. Ocean Depth ─────────────────────────────────────────
  buildPreset({
    id: "ocean-depth",
    name: "Ocean Depth",
    nameZh: "深海蓝",
    description: "Professional deep blue, data-dense, financial-grade clarity",
    mode: "default",
    primary: {
      50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc",
      400: "#38bdf8", 500: "#0369a1", 600: "#0284c7", 700: "#075985",
      800: "#0c4a6e", 900: "#082f49",
    },
    neutral: {
      0: "#ffffff", 50: "#f4f7fa", 100: "#e8edf2", 200: "#d1dae3",
      300: "#b0bdc8", 400: "#8595a3", 500: "#5d6d7d", 600: "#445361",
      700: "#2d3a47", 800: "#19242e", 900: "#0a1628",
    },
    success: { 50: "#ecfdf5", 500: "#10b981", 700: "#047857" },
    warning: { 50: "#fffbeb", 500: "#d97706", 700: "#b45309" },
    error: { 50: "#fef2f2", 500: "#dc2626", 700: "#b91c1c" },
    info: { 50: "#e0f2fe", 500: "#0284c7", 700: "#0369a1" },
    sidebarBg: "#0a1628",
  }),
];

// ── Lookup helpers ────────────────────────────────────────────
export const presetMap = Object.fromEntries(
  themePresets.map((p) => [p.id, p])
) as Record<string, ThemePreset>;

export const defaultPresetId = "tech-saas";
