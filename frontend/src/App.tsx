import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Spin } from "antd";

import { useAuthStore } from "./stores/authStore";
import { useAppStore } from "./stores/appStore";
import MainLayout from "./components/common/MainLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductDetail from "./pages/Products/ProductDetail";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/Projects/ProjectDetail";
import Design from "./pages/Design";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/Suppliers/SupplierDetail";
import Lifecycle from "./pages/Lifecycle";
import Firmware from "./pages/Firmware";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import AuthCallback from "./pages/Login/AuthCallback";
import Certifications from "./pages/Certifications";
import Settings from "./pages/Settings";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <Spin size="large" />
        <span style={{ color: "#94a3b8", fontSize: 14 }}>Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="design" element={<Design />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="suppliers/:id" element={<SupplierDetail />} />
        <Route path="lifecycle" element={<Lifecycle />} />
        <Route path="firmware" element={<Firmware />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="admin" element={<Admin />} />
        <Route path="certifications" element={<Certifications />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
