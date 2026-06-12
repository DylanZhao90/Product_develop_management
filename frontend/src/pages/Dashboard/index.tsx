import { Card, Col, Row, Statistic, Table, Tag, Typography } from "antd";
import {
  AppstoreOutlined,
  ProjectOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../../services/api";
import { useLocale } from "../../locales";

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

  const { data: statsResp } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApi.getStats(),
  });

  const stats = statsResp?.data?.data;

  const recentProjectColumns = [
    { title: "Project", dataIndex: "name", key: "name", ellipsis: true },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (v: string) => (
        <Tag color={projectStatusColors[v]}>{t(`project.status.${v}`)}</Tag>
      ),
    },
  ];

  const recentTaskColumns = [
    { title: "Task", dataIndex: "name", key: "name", ellipsis: true },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v: string) => (
        <Tag color={taskStatusColors[v]}>{t(`task.status.${v}`)}</Tag>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>{t("menu.dashboard")}</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Products"
              value={stats?.active_products ?? 0}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: "#1677ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Projects"
              value={stats?.active_projects ?? 0}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Tasks"
              value={stats?.pending_tasks ?? 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Completed Tasks"
              value={stats?.completed_tasks ?? 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title="Recent Projects"
            extra={
              <a onClick={() => navigate("/projects")} style={{ cursor: "pointer", fontSize: 13 }}>
                View All
              </a>
            }
          >
            {stats?.recent_projects?.length > 0 ? (
              <Table
                columns={recentProjectColumns}
                dataSource={stats.recent_projects}
                rowKey="id"
                pagination={false}
                size="small"
                onRow={(record: { id: string }) => ({
                  onClick: () => navigate(`/projects/${record.id}`),
                  style: { cursor: "pointer" },
                })}
              />
            ) : (
              <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Recent Tasks">
            {stats?.recent_tasks?.length > 0 ? (
              <Table
                columns={recentTaskColumns}
                dataSource={stats.recent_tasks}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
