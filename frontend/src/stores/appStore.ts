import { create } from "zustand";

interface AppState {
  language: "zh-CN" | "en-US";
  sidebarCollapsed: boolean;
  setLanguage: (lang: "zh-CN" | "en-US") => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: (localStorage.getItem("language") as "zh-CN" | "en-US") || "zh-CN",
  sidebarCollapsed: false,
  setLanguage: (lang) => {
    localStorage.setItem("language", lang);
    set({ language: lang });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
