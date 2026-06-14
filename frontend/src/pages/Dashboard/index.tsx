import { Card, Col, Row, Statistic, Table, Tag, Typography, Skeleton } from "antd";
import {
  AppstoreOutlined,
  ProjectOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../../services/api";
import { useLocale } from "../../locales";
import { useEChartsColors } from "../../theme/echartsTheme";

const projectStatusColors: Record<string, string> = {
  pending_approval: "gold",
  approved: "blue",
  in_progress: "processing",
  completed: "green",
  closed: "default",
};

const taskStatusColors: Record<string, string> = {
  pending: "default",
  in_progress: "processing",
  completed: "green",
  blocked: "red",
};

export default function Dashboard() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const ec = useEChartsColors();

  const { data: statsResp, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApi.getStats(),
  });

  const stats = statsResp?.data?.data;

  const recentProjectColumns = [
    {
      title: t("common.project") || "Project",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (v: string) => (
        <Typography.Text style={{ fontWeight: 500 }}>{v}</Typography.Text>
      ),
    },
    {
      title: t("common.status") || "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (v: string) => (
        <Tag color={projectStatusColors[v]} style={{ borderRadius: 6 }}>
          {t(`project.status.${v}`)}
        </Tag>
      ),
    },
  ];

  const recentTaskColumns = [
    {
      title: t("common.task") || "Task",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (v: string) => (
        <Typography.Text style={{ fontWeight: 500 }}>{v}</Typography.Text>
      ),
    },
    {
      title: t("common.status") || "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v: string) => (
        <Tag color={taskStatusColors[v]} style={{ borderRadius: 6 }}>
          {t(`task.status.${v}`)}
        </Tag>
      ),
    },
  ];

  const statCards = [
    {
      key: "products",
      title: t("dashboard.activeProducts") || "Active Products",
      value: stats?.active_products ?? 0,
      prefix: <AppstoreOutlined />,
      accent: "stat-primary",
      valueColor: ec.primary,
      onClick: () => navigate("/products"),
    },
    {
      key: "projects",
      title: t("dashboard.activeProjects") || "Active Projects",
      value: stats?.active_projects ?? 0,
      prefix: <ProjectOutlined />,
      accent: "stat-success",
      valueColor: ec.success,
      onClick: () => navigate("/projects"),
    },
    {
      key: "pending",
      title: t("dashboard.pendingTasks") || "Pending Tasks",
      value: stats?.pending_tasks ?? 0,
      prefix: <ClockCircleOutlined />,
      accent: "stat-warning",
      valueColor: ec.warning,
      onClick: () => navigate("/projects"),
    },
    {
      key: "completed",
      title: t("dashboard.completedTasks") || "Completed",
      value: stats?.completed_tasks ?? 0,
      prefix: <CheckCircleOutlined />,
      accent: "stat-purple",
      valueColor: ec.colors[3],
      onClick: () => navigate("/projects"),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <Typography.Title
          level={4}
          style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}
        >
          {t("menu.dashboard")}
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 14 }}>
          {t("dashboard.overview") || "Overview of your product development lifecycle"}
        </Typography.Text>
      </div>

      {/* Stat Cards */}
      <Row gutter={[16, 16]}>
        {statCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.key}>
            {isLoading ? (
              <Card>
                <Skeleton active paragraph={{ rows: 1 }} title={{ width: "60%" }} />
              </Card>
            ) : (
              <Card
                className={`stat-card ${card.accent}`}
                hoverable
                onClick={card.onClick}
                styles={{ body: { padding: "20px 24px" } }}
              >
                <Statistic
                  title={
                    <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                      {card.title}
                    </span>
                  }
                  value={card.value}
                  prefix={
                    <span
                      style={{
                        color: card.valueColor,
                        fontSize: 20,
                        marginRight: 4,
                      }}
                    >
                      {card.prefix}
                    </span>
                  }
                  valueStyle={{
                    color: card.valueColor,
                    fontSize: 32,
                    fontWeight: 700,
                    letterSpacing: "-1px",
                  }}
                />
              </Card>
            )}
          </Col>
        ))}
      </Row>

      {/* Detail Panels */}
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Typography.Text strong style={{ fontSize: 16 }}>
                {t("dashboard.recentProjects") || "Recent Projects"}
              </Typography.Text>
            }
            extra={
              <Typography.Link
                onClick={() => navigate("/projects")}
                style={{ fontSize: 13, fontWeight: 500 }}
              >
                {t("common.viewAll") || "View All"} <ArrowRightOutlined />
              </Typography.Link>
            }
            styles={{ body: { padding: "0 24px 24px" } }}
          >
            {stats?.recent_projects?.length > 0 ? (
              <Table
                columns={recentProjectColumns}
                dataSource={stats.recent_projects}
                rowKey="id"
                pagination={false}
                size="middle"
                showHeader={false}
                onRow={(record: { id: string }) => ({
                  onClick: () => navigate(`/projects/${record.id}`),
                  style: { cursor: "pointer" },
                })}
              />
            ) : (
              <div className="empty-state">
                <Typography.Text type="secondary">
                  {t("common.noData")}
                </Typography.Text>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Typography.Text strong style={{ fontSize: 16 }}>
                {t("dashboard.recentTasks") || "Recent Tasks"}
              </Typography.Text>
            }
            styles={{ body: { padding: "0 24px 24px" } }}
          >
            {stats?.recent_tasks?.length > 0 ? (
              <Table
                columns={recentTaskColumns}
                dataSource={stats.recent_tasks}
                rowKey="id"
                pagination={false}
                size="middle"
                showHeader={false}
              />
            ) : (
              <div className="empty-state">
                <Typography.Text type="secondary">
                  {t("common.noData")}
                </Typography.Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
