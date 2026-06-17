import { create } from "zustand";
import { api, authApi } from "../services/api";
import type { User } from "../services/api-types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  handleCallback: (code: string, state: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  /** Demo mode: skip backend auth for UI preview */
  enableDemo: () => void;
}

const DEMO_USER: User = {
  id: "demo-001",
  feishu_open_id: null,
  name: "Demo User",
  email: "demo@pdm.local",
  avatar_url: null,
  role: "admin",
  supplier_id: null,
  language_pref: "zh-CN",
  is_active: true,
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    window.location.href = `${baseUrl}/api/v1/auth/feishu/login`;
  },

  handleCallback: async (code: string, state: string) => {
    try {
      const resp = await authApi.callback(code, state);
      set({
        user: resp.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
      throw new Error("Authentication failed");
    }
  },

  logout: () => {
    localStorage.removeItem("demo_mode");
    set({ user: null, isAuthenticated: false });
    // Clear httpOnly cookies on the server side
    api.post("/auth/logout").catch(() => {});
  },

  checkAuth: async () => {
    // GitHub Pages / no-backend: always demo mode
    localStorage.setItem("demo_mode", "1");
    set({
      user: DEMO_USER,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  enableDemo: () => {
    localStorage.setItem("demo_mode", "1");
    set({
      user: DEMO_USER,
      isAuthenticated: true,
      isLoading: false,
    });
  },
}));
