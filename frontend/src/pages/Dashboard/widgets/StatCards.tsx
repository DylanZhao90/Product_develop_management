/**
 * StatCards — top-level statistics card group for the dashboard.
 */
import { Card, Col, Row, Skeleton } from "antd";
import {
  AppstoreOutlined,
  ProjectOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useEChartsColors } from "../../../theme/echartsTheme";
import type { DashboardStats } from "../../../services/api-types";

interface StatCardsProps {
  stats: DashboardStats | undefined;
  loading: boolean;
  ec: ReturnType<typeof useEChartsColors>;
  onNavigate: (path: string) => void;
  t: (key: string) => string;
}

export default function StatCards({ stats, loading, ec, onNavigate, t }: StatCardsProps) {
  const items = [
    { key: "products",  title: t("dashboard.activeProducts"), value: stats?.active_products ?? 0, icon: <AppstoreOutlined />, color: ec.primary,  path: "/products" },
    { key: "projects",  title: t("dashboard.activeProjects"), value: stats?.active_projects ?? 0, icon: <ProjectOutlined />, color: ec.success,  path: "/projects" },
    { key: "tasks",     title: t("dashboard.pendingTasks"),  value: stats?.pending_tasks ?? 0,  icon: <ClockCircleOutlined />, color: ec.warning, path: "/projects" },
    { key: "completed", title: t("dashboard.completedTasks"),value: stats?.completed_tasks ?? 0,icon: <CheckCircleOutlined />, color: ec.colors[3], path: "/projects" },
  ];

  return (
    <Row gutter={[16, 16]}>
      {items.map((item, i) => (
        <Col xs={24} sm={12} lg={6} key={item.key}>
          <div className="pdm-animate-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <Card
              hoverable
              className="pdm-stat-card"
              onClick={() => onNavigate(item.path)}
              styles={{ body: { padding: "20px 24px" } }}
            >
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} title={{ width: "60%" }} />
              ) : (
                <>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${item.color}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, color: item.color, marginBottom: 12,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: 4 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: item.color }}>
                    {item.value}
                  </div>
                </>
              )}
            </Card>
          </div>
        </Col>
      ))}
    </Row>
  );
}
