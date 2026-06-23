/**
 * PDM Theme Presets — 5 complete design systems.
 *
 * Each preset is self-contained: colors, Ant Design global tokens,
 * component-specific tokens, and algorithm (light/dark).
 *
 * v2 — UI depth optimization: higher contrast, deeper card depth,
 *        more distinct neutral palettes per preset, polished visuals.
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
  /** Override default page background (defaults to neutral[50] tweak) */
  bgPage?: string;
  /** Override default card shadow for deeper depth */
  cardShadow?: string;
  cardShadowHover?: string;
  borderColor?: string;
}): ThemePreset {
  const { primary, neutral, success, warning, error, info, sidebarBg } = cfg;

  // Compute contrast-friendly text colors
  const textPrimary = neutral[800];
  const textSecondary = neutral[500];
  const textMuted = neutral[400];
  const borderDefault = cfg.borderColor || neutral[200];
  const borderLight = neutral[100];
  const bgPage = cfg.bgPage || neutral[50];
  const cardShadow = cfg.cardShadow || "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
  const cardShadowHover = cfg.cardShadowHover || "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)";

  const isDark = cfg.mode === "dark";

  // Dark-mode overrides for base vars
  const darkNeutralText = neutral[800];
  const darkNeutralSecondary = neutral[600];
  const darkNeutralMuted = neutral[500];
  const darkBorder = neutral[200];

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

      // Higher contrast text
      colorTextBase: textPrimary,
      colorText: textPrimary,
      colorTextSecondary: textSecondary,
      colorTextTertiary: textMuted,
      colorTextQuaternary: neutral[300],

      colorBgBase: neutral[0],
      colorBgContainer: neutral[0],
      colorBgLayout: bgPage,
      colorBgElevated: neutral[0],
      colorBgSpotlight: neutral[800],

      colorBorder: borderDefault,
      colorBorderSecondary: borderLight,
      colorSplit: borderLight,
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

      boxShadow: cardShadow,
      boxShadowSecondary: `0 6px 20px 0 rgba(0,0,0,0.10), 0 3px 6px -4px rgba(0,0,0,0.06)`,
      boxShadowTertiary: cardShadow,

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
        triggerColor: isDark ? neutral[600] : neutral[300],
      },
      Menu: {
        darkItemBg: sidebarBg,
        darkItemColor: neutral[400],
        darkItemHoverBg: `${primary[500]}3D`,
        darkItemHoverColor: neutral[0],
        darkItemSelectedBg: `${primary[500]}52`,
        darkItemSelectedColor: neutral[0],
        darkSubMenuItemBg: sidebarBg,
        darkItemDisabledColor: neutral[600],
        itemBorderRadius: 8,
        itemMarginInline: 8,
      },
      Table: {
        headerBg: neutral[100],
        headerColor: textSecondary,
        headerSplitColor: "transparent",
        rowHoverBg: `${primary[500]}0F`,
        borderColor: borderLight,
        cellPaddingBlock: 12,
        cellPaddingInline: 16,
      },
      Card: {
        paddingLG: 24,
        borderRadiusLG: 12,
        colorBgContainer: neutral[0],
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
        linkColor: textSecondary,
        linkHoverColor: primary[500],
        separatorColor: textMuted,
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
        itemColor: textSecondary,
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

    // ── Dark-mode component overrides ──
    ...(isDark
      ? {
          componentTokens: {
            Layout: {
              siderBg: sidebarBg,
              triggerBg: neutral[800],
              triggerColor: neutral[600],
            },
            Menu: {
              darkItemBg: sidebarBg,
              darkItemColor: neutral[400],
              darkItemHoverBg: `${primary[500]}3D`,
              darkItemHoverColor: neutral[0],
              darkItemSelectedBg: `${primary[500]}52`,
              darkItemSelectedColor: neutral[0],
              darkSubMenuItemBg: sidebarBg,
              darkItemDisabledColor: neutral[600],
              itemBorderRadius: 8,
              itemMarginInline: 8,
            },
            Table: {
              headerBg: neutral[100],
              headerColor: neutral[500],
              headerSplitColor: "transparent",
              rowHoverBg: `${primary[500]}14`,
              borderColor: neutral[200],
              cellPaddingBlock: 12,
              cellPaddingInline: 16,
            },
            Card: {
              paddingLG: 24,
              borderRadiusLG: 12,
              colorBgContainer: neutral[50],
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
              colorBgContainer: neutral[50],
              colorBorder: neutral[200],
            },
            Tag: { borderRadiusSM: 6, colorBgContainer: neutral[100] },
            Modal: {
              borderRadiusLG: 16,
              titleFontSize: 18,
              contentBg: neutral[50],
              headerBg: neutral[50],
            },
            Statistic: { titleFontSize: 14, contentFontSize: 28 },
            Tabs: {
              itemColor: neutral[500],
              itemHoverColor: primary[500],
              itemSelectedColor: primary[500],
              inkBarColor: primary[500],
            },
            Select: {
              borderRadius: 8,
              controlHeight: 36,
              optionSelectedBg: `${primary[500]}26`,
              optionSelectedColor: primary[500],
              colorBgContainer: neutral[50],
              colorBorder: neutral[200],
            },
            DatePicker: {
              borderRadius: 8,
              controlHeight: 36,
              colorBgContainer: neutral[50],
              colorBorder: neutral[200],
            },
            Breadcrumb: {
              fontSize: 14,
              linkColor: neutral[500],
              linkHoverColor: primary[500],
              separatorColor: neutral[400],
            },
            Tooltip: { borderRadius: 8, colorBgSpotlight: neutral[800] },
            Popover: { borderRadius: 12, colorBgElevated: neutral[50] },
            Notification: { borderRadiusLG: 12, colorBgElevated: neutral[50] },
            Drawer: { paddingLG: 24 },
            Dropdown: { colorBgElevated: neutral[50] },
          },
        }
      : {}),

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

      "--color-bg-page": bgPage,
      "--color-bg-card": neutral[0],
      "--color-border": borderDefault,
      "--color-border-light": borderLight,

      "--color-text": textPrimary,
      "--color-text-secondary": textSecondary,
      "--color-text-muted": textMuted,

      "--radius-sm": "6px",
      "--radius-md": "8px",
      "--radius-lg": "12px",
      "--radius-xl": "16px",

      /* ── Layout ── */
      "--sidebar-width": "232px",
      "--sidebar-collapsed-width": "64px",
      "--sidebar-brand-height": "64px",
      "--header-height": "56px",
      "--header-height-mobile": "48px",
      "--content-margin": "24px",
      "--content-margin-mobile": "12px",

      /* ── Typography ── */
      "--font-size-h1": "28px",
      "--font-size-h2": "24px",
      "--font-size-h3": "20px",
      "--font-size-h4": "16px",
      "--font-size-body": "14px",
      "--font-size-small": "12px",
      "--font-size-xs": "11px",
      "--font-size-tag": "11px",
      "--font-size-stat": "28px",
      "--font-size-stat-mobile": "22px",
      "--font-weight-normal": "400",
      "--font-weight-medium": "500",
      "--font-weight-semibold": "600",
      "--font-weight-bold": "700",

      /* ── Spacing ── */
      "--spacing-xs": "4px",
      "--spacing-sm": "8px",
      "--spacing-md": "12px",
      "--spacing-lg": "16px",
      "--spacing-xl": "24px",
      "--spacing-xxl": "32px",

      /* ── Card ── */
      "--card-padding": "24px",
      "--card-padding-mobile": "12px",
      "--card-border-radius": "12px",
      "--card-shadow": cardShadow,
      "--card-shadow-hover": cardShadowHover,

      /* ── Table ── */
      "--table-cell-padding": "12px 16px",
      "--table-cell-padding-sm": "8px 12px",
      "--table-header-font-size": "12px",
      "--table-row-font-size": "13px",

      /* ── Form Controls ── */
      "--control-height": "36px",
      "--control-height-lg": "44px",
      "--control-height-sm": "28px",
      "--input-padding": "8px 12px",
      "--input-radius": "8px",

      /* ── Tags ── */
      "--tag-radius": "6px",
      "--tag-font-size": "11px",
      "--tag-padding": "1px 8px",

      /* ── Modal ── */
      "--modal-radius": "16px",
      "--modal-width": "520px",
      "--modal-width-sm": "400px",
      "--modal-width-lg": "720px",

      /* ── Drawer ── */
      "--drawer-padding": "24px",

      /* ── Statistics Card ── */
      "--stat-font-size": "28px",
      "--stat-font-size-mobile": "22px",
      "--stat-label-size": "14px",

      /* ── Chart ── */
      "--chart-mini-height": "190px",
      "--chart-mini-height-mobile": "150px",
      "--chart-sankey-height": "500px",
      "--chart-sankey-height-lg": "600px",

      /* ── Page Header ── */
      "--page-header-margin": "24px",
      "--page-header-margin-mobile": "14px",
      "--page-header-title-size": "22px",
      "--page-header-desc-size": "14px",

      /* ── Transitions ── */
      "--transition-fast": "0.15s",
      "--transition-base": "0.25s",
      "--transition-slow": "0.4s",
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// 5 Theme Presets — v2.1: Vercel-inspired default, 5 distinct visuals
// ═══════════════════════════════════════════════════════════════

export const themePresets: ThemePreset[] = [
  // ── 1. Vercel Light (default) — engineered clarity ──────────
  // Near-monochrome with Vercel-blue link accent, crisp hairlines,
  // stacked-shadow elevation, ink-on-white typographic precision.
  // Following the Vercel DESIGN.md design system reference.
  buildPreset({
    id: "vercel-light",
    name: "Vercel Light",
    nameZh: "Vercel 明亮",
    description: "Near-monochrome canvas, blue link accent, crisp hairlines, engineered clarity — inspired by Vercel",
    mode: "default",
    primary: {
      50: "#e8f0fe", 100: "#d3e5ff", 200: "#a8c7fa", 300: "#7aa9f5",
      400: "#4d8bf0", 500: "#0070f3", 600: "#0761d1", 700: "#0052b3",
      800: "#003d82", 900: "#002856",
    },
    neutral: {
      0: "#ffffff", 50: "#fafafa", 100: "#f5f5f5", 200: "#ebebeb",
      300: "#d4d4d4", 400: "#888888", 500: "#4d4d4d", 600: "#333333",
      700: "#1a1a1a", 800: "#171717", 900: "#0a0a0a",
    },
    success: { 50: "#ecfdf3", 500: "#10b981", 700: "#047857" },
    warning: { 50: "#ffefcf", 500: "#f5a623", 700: "#ab570a" },
    error: { 50: "#fef2f2", 500: "#ee0000", 700: "#c50000" },
    info: { 50: "#d3e5ff", 500: "#0070f3", 700: "#0761d1" },
    sidebarBg: "#171717",
    bgPage: "#fafafa",
    // Vercel stacked-shadow: hairline + micro shadows
    cardShadow: "0 0 0 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)",
    cardShadowHover: "0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.06)",
    borderColor: "#ebebeb",
  }),

  // ── 2. Vercel Dark — polarity-flip of Vercel Light ──────────
  // Dark canvas with blue accent, crisp border-driven depth,
  // high-contrast text, minimal shadows. Dark counterpart of
  // Vercel Light following Vercel's inverted-color tokens.
  buildPreset({
    id: "vercel-dark",
    name: "Vercel Dark",
    nameZh: "Vercel 暗色",
    description: "Dark canvas, blue accent, crisp borders, high contrast — Vercel dark mode",
    mode: "dark",
    primary: {
      50: "#002856", 100: "#003d82", 200: "#0052b3", 300: "#0761d1",
      400: "#4d8bf0", 500: "#3b82f6", 600: "#60a5fa", 700: "#93bbfd",
      800: "#bfdbfe", 900: "#dbeafe",
    },
    neutral: {
      0: "#0a0a0a", 50: "#111111", 100: "#171717", 200: "#222222",
      300: "#2a2a2a", 400: "#555555", 500: "#888888", 600: "#a3a3a3",
      700: "#cccccc", 800: "#e8e8e8", 900: "#f5f5f5",
    },
    success: { 50: "#052e16", 500: "#22c55e", 700: "#4ade80" },
    warning: { 50: "#2d1f0a", 500: "#f5a623", 700: "#fbbf24" },
    error: { 50: "#2d0f0f", 500: "#ee0000", 700: "#ff3333" },
    info: { 50: "#002856", 500: "#3b82f6", 700: "#60a5fa" },
    sidebarBg: "#0a0a0a",
    bgPage: "#111111",
    cardShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.3)",
    cardShadowHover: "0 0 0 1px rgba(255,255,255,0.06), 0 4px 12px rgba(0,0,0,0.4)",
    borderColor: "#222222",
  }),

  // ── 3. Forest Emerald ──────────────────────────────────────
  // Nature-inspired greens with warm undertones. Soft earthy
  // neutrals, green accent, eye-friendly and humanized.
  buildPreset({
    id: "forest-emerald",
    name: "Forest Emerald",
    nameZh: "自然翡翠",
    description: "Nature-inspired greens, soft earthy neutrals, eye-friendly and warm",
    mode: "default",
    primary: {
      50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7",
      400: "#34d399", 500: "#059669", 600: "#047857", 700: "#065f46",
      800: "#064e3b", 900: "#022c22",
    },
    neutral: {
      0: "#ffffff", 50: "#f6faf7", 100: "#eaf2ed", 200: "#d7e3dc",
      300: "#bcc9c0", 400: "#8d9b91", 500: "#5e6d63", 600: "#435248",
      700: "#2d3a31", 800: "#1c261f", 900: "#0e1a13",
    },
    success: { 50: "#ecfdf5", 500: "#10b981", 700: "#047857" },
    warning: { 50: "#fff7ed", 500: "#d97706", 700: "#b45309" },
    error: { 50: "#fef2f2", 500: "#dc2626", 700: "#b91c1c" },
    info: { 50: "#eef2ff", 500: "#6366f1", 700: "#4f46e5" },
    sidebarBg: "#0e1a13",
    bgPage: "#eef5f0",
    cardShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
    cardShadowHover: "0 6px 18px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.03)",
    borderColor: "#d7e3dc",
  }),

  // ── 4. Sunset Amber ────────────────────────────────────────
  // Warm amber tones with sandy neutrals. Creative energy,
  // approachable feel, slightly vintage warmth.
  buildPreset({
    id: "sunset-amber",
    name: "Sunset Amber",
    nameZh: "日落琥珀",
    description: "Warm amber tones, sandy neutrals, creative and approachable",
    mode: "default",
    primary: {
      50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d",
      400: "#fbbf24", 500: "#d97706", 600: "#b45309", 700: "#92400e",
      800: "#78350f", 900: "#451a03",
    },
    neutral: {
      0: "#ffffff", 50: "#fdfaf5", 100: "#f6efe6", 200: "#e9dfd3",
      300: "#d4c7b8", 400: "#a89784", 500: "#7e6b58", 600: "#5f4f40",
      700: "#42372c", 800: "#2a221b", 900: "#1a1410",
    },
    success: { 50: "#ecfdf5", 500: "#10b981", 700: "#047857" },
    warning: { 50: "#fff7ed", 500: "#ea580c", 700: "#c2410c" },
    error: { 50: "#fef2f2", 500: "#dc2626", 700: "#b91c1c" },
    info: { 50: "#eef2ff", 500: "#6366f1", 700: "#4f46e5" },
    sidebarBg: "#1a1410",
    bgPage: "#f8f2ea",
    cardShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
    cardShadowHover: "0 6px 18px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.03)",
    borderColor: "#e9dfd3",
  }),

  // ── 5. Ocean Depth ─────────────────────────────────────────
  // Professional deep blue with cool steel neutrals.
  // Financial-grade clarity, dense data feel.
  buildPreset({
    id: "ocean-depth",
    name: "Ocean Depth",
    nameZh: "深海蓝",
    description: "Professional deep blue, cool steel neutrals, data-dense clarity",
    mode: "default",
    primary: {
      50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc",
      400: "#38bdf8", 500: "#0369a1", 600: "#0284c7", 700: "#075985",
      800: "#0c4a6e", 900: "#082f49",
    },
    neutral: {
      0: "#ffffff", 50: "#f2f6fa", 100: "#e4eaf1", 200: "#d0d8e3",
      300: "#b1bbc9", 400: "#7f8b9e", 500: "#556172", 600: "#3d4857",
      700: "#28323f", 800: "#17202b", 900: "#0c1420",
    },
    success: { 50: "#ecfdf5", 500: "#10b981", 700: "#047857" },
    warning: { 50: "#fffbeb", 500: "#d97706", 700: "#b45309" },
    error: { 50: "#fef2f2", 500: "#dc2626", 700: "#b91c1c" },
    info: { 50: "#e0f2fe", 500: "#0284c7", 700: "#0369a1" },
    sidebarBg: "#0c1420",
    bgPage: "#eef3f8",
    cardShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.03)",
    cardShadowHover: "0 6px 18px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.03)",
    borderColor: "#d0d8e3",
  }),
];

// ── Lookup helpers ────────────────────────────────────────────
export const presetMap = Object.fromEntries(
  themePresets.map((p) => [p.id, p])
) as Record<string, ThemePreset>;

export const defaultPresetId = "vercel-light";
