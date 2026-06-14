import { create } from "zustand";
import { defaultPresetId } from "../theme/presets";
import type { ThemePreset } from "../theme/presets";

type ThemeId = string;

interface AppState {
  language: "zh-CN" | "en-US";
  sidebarCollapsed: boolean;
  themeId: ThemeId;
  setLanguage: (lang: "zh-CN" | "en-US") => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setTheme: (id: ThemeId) => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: (localStorage.getItem("language") as "zh-CN" | "en-US") || "zh-CN",
  sidebarCollapsed: false,
  themeId: localStorage.getItem("theme") || defaultPresetId,

  setLanguage: (lang) => {
    localStorage.setItem("language", lang);
    set({ language: lang });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setTheme: (id) => {
    localStorage.setItem("theme", id);
    set({ themeId: id });
  },
}));

/** Non-reactive helper: read current theme outside React */
export function getCurrentThemeId(): ThemeId {
  return localStorage.getItem("theme") || defaultPresetId;
}
