# PDM Frontend — Theme Configuration Guide

## Where to Customize

The visual system lives in `src/theme/` and has 3 layers:

```
src/theme/
├── presets.ts          ← ALL configurable values (the single source of truth)
├── ThemeProvider.tsx   ← Applies preset to Ant Design
├── tokens.ts           ← Re-exports (add your custom exports here)
├── echartsTheme.ts     ← Chart color hooks
└── global.css          ← CSS variables + dark-mode overrides
```

---

## Layer 1: `presets.ts` — The Single Source of Truth

**This is the only file you need to edit** for most visual changes.

### Theme Presets (5 built-in)

```ts
themePresets = [
  { id: "tech-saas",      name: "科技蓝紫" },  // default
  { id: "linear-dark",    name: "Linear 暗色" },
  { id: "forest-emerald", name: "自然翡翠" },
  { id: "sunset-amber",   name: "日落琥珀" },
  { id: "ocean-depth",    name: "深海蓝" },
]
```

### What You Can Configure in Each Preset

#### A. Color Scales (`colors` block)

```ts
primary: {
  50: "#eef2ff",   // lightest (backgrounds)
  100: "#e0e7ff",  // hover backgrounds
  200: "#c7d2fe",  // borders
  300: "#a5b4fc",  // light borders
  400: "#818cf8",  // hover text
  500: "#4f6ef6",  // ← MAIN PRIMARY (buttons, links, active)
  600: "#3b5de7",  // hover
  700: "#334ed6",  // active/pressed
  800: "#2a3fb8",  // dark
  900: "#1e2f8a",  // darkest
}
```

Same structure for: `success`, `warning`, `error`, `info`, `neutral`

**neutral[0]** = white / card background  
**neutral[50]** = page background  
**neutral[100-200]** = borders  
**neutral[400-500]** = secondary text  
**neutral[700]** = primary text  
**neutral[800-900]** = dark / sidebar

#### B. Ant Design Global Tokens (`antdTokens`)

Ant Design's full token API: https://ant.design/docs/react/customize-theme#token

Key tokens available:

```ts
antdTokens: {
  colorPrimary:      "#4f6ef6",  // primary color
  colorTextBase:     "#334155",  // text base
  colorBgLayout:     "#f8fafc",  // page background
  colorBgContainer:  "#ffffff",  // card / container background
  fontFamily:        "...",      // font stack
  fontSize:          14,         // base font size
  borderRadius:      8,          // border radius
  boxShadow:         "...",      // card shadow
  controlHeight:     36,         // input/button height
  padding:           16,         // base padding
  margin:            16,         // base margin
  // ... see full list in presets.ts
}
```

#### C. Component Tokens (`componentTokens`)

Per-component customization via Ant Design Component Token API:

```ts
componentTokens: {
  Layout:  { siderBg, triggerBg },
  Menu:    { darkItemBg, darkItemColor, darkItemSelectedBg, ... },
  Table:   { headerBg, headerColor, rowHoverBg, cellPaddingBlock, cellPaddingInline, ... },
  Card:    { paddingLG, borderRadiusLG, ... },
  Button:  { borderRadius, controlHeight, paddingInline, ... },
  Input:   { borderRadius, controlHeight, ... },
  Tag:     { borderRadiusSM },
  Modal:   { borderRadiusLG, titleFontSize },
  Tabs:    { itemColor, itemSelectedColor, inkBarColor, ... },
  Select:  { borderRadius, controlHeight, optionSelectedBg, ... },
  Statistic: { titleFontSize, contentFontSize },
  // ... see full list in presets.ts
}
```

#### D. CSS Custom Properties (`cssVariables`)

Every value listed below becomes a CSS variable on `:root`. 
**Reference them in `global.css` instead of hardcoded values.**

```css
/* ── Colors ── */
--color-primary            /* main brand color */
--color-primary-hover      /* hover state */
--color-primary-bg         /* translucent bg */
--color-primary-border     /* border */
--color-sidebar-bg         /* sidebar background */
--color-sidebar-hover      /* sidebar item hover */
--color-sidebar-active     /* sidebar selected */
--color-success            /* success */
--color-warning            /* warning */
--color-error              /* error */
--color-bg-page            /* page background */
--color-bg-card            /* card white */
--color-border             /* borders */
--color-border-light       /* lighter borders */
--color-text               /* primary text */
--color-text-secondary     /* secondary text */
--color-text-muted         /* muted text */

/* ── Border Radius ── */
--radius-sm   /* 6px  - tags, small elements */
--radius-md   /* 8px  - inputs, buttons */
--radius-lg   /* 12px - cards, modals */
--radius-xl   /* 16px - large modals */

/* ── Layout ── */
--sidebar-width           /* 232px */
--sidebar-collapsed-width /* 64px */
--sidebar-brand-height    /* 64px */
--header-height           /* 56px */
--header-height-mobile    /* 48px */
--content-margin          /* 24px */
--content-margin-mobile   /* 12px */

/* ── Typography ── */
--font-size-h1           /* 28px */
--font-size-h2           /* 24px */
--font-size-h3           /* 20px */
--font-size-h4           /* 16px */
--font-size-body         /* 14px */
--font-size-small        /* 12px */
--font-size-xs           /* 11px */
--font-size-tag          /* 11px */
--font-size-stat         /* 28px */
--font-size-stat-mobile  /* 22px */
--font-weight-normal     /* 400 */
--font-weight-medium     /* 500 */
--font-weight-semibold   /* 600 */
--font-weight-bold       /* 700 */

/* ── Spacing ── */
--spacing-xs    /* 4px */
--spacing-sm    /* 8px */
--spacing-md    /* 12px */
--spacing-lg    /* 16px */
--spacing-xl    /* 24px */
--spacing-xxl   /* 32px */

/* ── Card ── */
--card-padding         /* 24px */
--card-padding-mobile  /* 12px */
--card-border-radius   /* 12px */
--card-shadow          /* box-shadow value */

/* ── Table ── */
--table-cell-padding      /* 12px 16px */
--table-cell-padding-sm   /* 8px 12px */
--table-header-font-size  /* 12px */
--table-row-font-size     /* 13px */

/* ── Form Controls ── */
--control-height    /* 36px */
--control-height-lg /* 44px */
--control-height-sm /* 28px */
--input-padding     /* 8px 12px */
--input-radius      /* 8px */

/* ── Tags ── */
--tag-radius    /* 6px */
--tag-font-size /* 11px */
--tag-padding   /* 1px 8px */

/* ── Modal ── */
--modal-radius    /* 16px */
--modal-width     /* 520px */
--modal-width-sm  /* 400px */
--modal-width-lg  /* 720px */

/* ── Drawer ── */
--drawer-padding /* 24px */

/* ── Statistics ── */
--stat-font-size        /* 28px */
--stat-font-size-mobile /* 22px */
--stat-label-size       /* 14px */

/* ── Chart ── */
--chart-mini-height        /* 190px */
--chart-mini-height-mobile /* 150px */
--chart-sankey-height      /* 500px */
--chart-sankey-height-lg   /* 600px */

/* ── Page Header ── */
--page-header-margin       /* 24px */
--page-header-margin-mobile/* 14px */
--page-header-title-size   /* 22px */
--page-header-desc-size    /* 14px */

/* ── Transitions ── */
--transition-fast  /* 0.15s */
--transition-base  /* 0.25s */
--transition-slow  /* 0.4s */
```

---

## Layer 2: `global.css`

This file should reference **only CSS variables** from presets.ts.

```css
/* ✅ Correct — uses variable */
.page-header-title {
  font-size: var(--font-size-h4);
}

/* ❌ Wrong — hardcoded */
.page-header-title {
  font-size: 16px;
}
```

If you need to add new CSS, always use the existing variables.
If a value you need doesn't have a variable yet, add it to `presets.ts` first.

---

## Layer 3: `ThemeProvider.tsx`

This file bridges presets.ts → Ant Design. Normally you don't need to touch it.
It applies:
1. `token` → Ant Design global theme tokens
2. `components` → Ant Design per-component tokens
3. `cssVariables` → CSS custom properties on `:root`
4. `algorithm` → light or dark algorithm

---

## Quick Customization Examples

### Change the page background color

In `presets.ts`, change `neutral[50]` for each preset:

```ts
// Before
neutral: { 50: "#f8fafc", ... }

// After  
neutral: { 50: "#e8edf4", ... }
```

Or change `--color-bg-page` in the `cssVariables` block.

### Make all cards have more padding

In `presets.ts`, change `cssVariables["--card-padding"]`:

```ts
"--card-padding": "32px",  // was 24px
```

### Change the sidebar width

In `presets.ts`, change:

```ts
"--sidebar-width": "280px",  // was 232px
```

### Add a new theme preset

Copy/paste an existing `buildPreset({...})` block and change the colors:

```ts
buildPreset({
  id: "my-custom-theme",
  name: "My Theme",
  nameZh: "我的主题",
  description: "...",
  mode: "default",
  primary: { /* your colors */ },
  neutral: { /* your gray scale */ },
  // ...
})
```

---

## Adding New CSS Variables

If you need a new configurable value:

1. Add the variable to `presets.ts` inside `cssVariables`
2. Reference it in `global.css` with `var(--your-variable-name)`
3. Add it to this README

That's it — no other files need changes.
