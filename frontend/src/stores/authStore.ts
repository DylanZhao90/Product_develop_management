import { create } from "zustand";
import { api } from "../services/api";

interface User {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: string;
  language_pref: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  handleCallback: (code: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  /** Demo mode: skip backend auth for UI preview */
  enableDemo: () => void;
}

const DEMO_USER: User = {
  id: "demo-001",
  name: "Demo User",
  email: "demo@pdm.local",
  avatar_url: null,
  role: "admin",
  language_pref: "zh-CN",
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem("access_token"),
  isAuthenticated: false,
  isLoading: true,

  login: () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    window.location.href = `${baseUrl}/api/v1/auth/feishu/login`;
  },

  handleCallback: async (code: string) => {
    try {
      const resp = await api.post("/auth/feishu/callback", { code });
      const data = resp.data;
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      set({
        token: data.access_token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
      throw new Error("Authentication failed");
    }
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("demo_mode");
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    // Demo mode: skip backend, use mock user
    if (localStorage.getItem("demo_mode") === "1") {
      set({
        user: DEMO_USER,
        token: "demo-token",
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    const token = get().token;
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const resp = await api.get("/auth/me");
      set({
        user: resp.data.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ token: null, user: null, isLoading: false });
    }
  },

  enableDemo: () => {
    localStorage.setItem("demo_mode", "1");
    set({
      user: DEMO_USER,
      token: "demo-token",
      isAuthenticated: true,
      isLoading: false,
    });
  },
}));
