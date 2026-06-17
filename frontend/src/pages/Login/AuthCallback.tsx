import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spin, message } from "antd";
import { useAuthStore } from "../../stores/authStore";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuthStore();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state") || "";
    if (!code) {
      message.error("Missing authorization code");
      navigate("/login");
      return;
    }
    handleCallback(code, state)
      .then(() => {
        message.success("Login successful");
        navigate("/");
      })
      .catch(() => {
        message.error("Login failed");
        navigate("/login");
      });
  }, [searchParams, handleCallback, navigate]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <Spin size="large" tip="Authenticating with Feishu..." />
    </div>
  );
}
