/**
 * ECharts theme — dynamic, reads from active theme preset.
 */
import { useMemo } from "react";
import { useAppStore } from "../stores/appStore";
import { presetMap, defaultPresetId } from "./presets";

/** React hook: returns ECharts color palette matching the active theme. */
export function useEChartsColors() {
  const themeId = useAppStore((s) => s.themeId);
  return useMemo(() => {
    const preset = presetMap[themeId] || presetMap[defaultPresetId];
    const p = preset.colors.primary;
    const s = preset.colors.success;
    const w = preset.colors.warning;
    const e = preset.colors.error;
    const i = preset.colors.info;

    return {
      colors: [
        p[500], // primary
        s[500], // success
        w[500], // warning
        "#8b5cf6", // purple
        e[500], // error
        i[500], // info
        "#10b981", // emerald
        "#f97316", // orange
        "#06b6d4", // cyan
        "#ec4899", // pink
      ],
      primary: p[500],
      success: s[500],
      warning: w[500],
      error: e[500],
      info: i[500],
      baseChartOption: {
        color: [
          p[500], s[500], w[500], "#8b5cf6", e[500],
          i[500], "#10b981", "#f97316", "#06b6d4", "#ec4899",
        ],
      },
    };
  }, [themeId]);
}

/** Static import for non-React contexts — returns default theme colors. */
export const echartsColors = [
  "#4f6ef6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444",
  "#6366f1", "#10b981", "#f97316", "#06b6d4", "#ec4899",
];

export const baseChartOption = { color: echartsColors };
