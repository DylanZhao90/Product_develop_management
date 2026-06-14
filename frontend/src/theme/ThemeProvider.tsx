import { useEffect } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import type { ReactNode } from "react";
import { useAppStore } from "../stores/appStore";
import { presetMap, defaultPresetId } from "./presets";
import { getAntdLocale } from "../locales";

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Wraps the app with Ant Design 5 ConfigProvider.
 * Reads the active theme from zustand store and applies:
 * - Ant Design tokens + component tokens
 * - Light or dark algorithm
 * - CSS custom properties on :root
 * - Ant Design locale
 */
export default function ThemeProvider({ children }: ThemeProviderProps) {
  const language = useAppStore((s) => s.language);
  const themeId = useAppStore((s) => s.themeId);

  const preset = presetMap[themeId] || presetMap[defaultPresetId];

  // Inject CSS custom properties on theme change
  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(preset.cssVariables)) {
      root.style.setProperty(key, value);
    }
    // Also set data attribute for CSS selectors
    root.setAttribute("data-theme", preset.id);
  }, [preset]);

  return (
    <ConfigProvider
      locale={getAntdLocale(language)}
      theme={{
        token: preset.antdTokens,
        components: preset.componentTokens,
        algorithm:
          preset.mode === "dark"
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
}
