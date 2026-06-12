import { Card, Col, Row, Statistic, Typography } from "antd";
import { AppstoreOutlined, ProjectOutlined, CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../../services/api";
import { useLocale } from "../../locales";
import ReactECharts from "echarts-for-react";

export default function Analytics() {
  const { t } = useLocale();

  const { data: overviewResp } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: () => analyticsApi.getOverview(),
  });

  const { data: taskResp } = useQuery({
    queryKey: ["analytics-task-stats"],
    queryFn: () => analyticsApi.getTaskStats(),
  });

  const { data: trendsResp } = useQuery({
    queryKey: ["analytics-trends"],
    queryFn: () => analyticsApi.getTrends(),
  });

  const { data: issueResp } = useQuery({
    queryKey: ["analytics-issue-dist"],
    queryFn: () => analyticsApi.getIssueDistribution(),
  });

  const overview = overviewResp?.data?.data || {};
  const taskData = taskResp?.data?.data || {};
  const trendData = trendsResp?.data?.data || [];
  const issueData = issueResp?.data?.data || [];

  // Product lifecycle distribution pie
  const statusData = overview.products_by_status || {};
  const statusPie = {
    tooltip: { trigger: "item" as const },
    legend: { bottom: 0 },
    series: [{
      type: "pie" as const,
      radius: ["40%", "70%"],
      data: Object.entries(statusData).map(([k, v]) => ({
        name: t(`product.status.${k}`) || k, value: v as number,
      })),
    }],
  };

  // Project status bar chart
  const projectData = overview.projects_by_status || {};
  const projectBar = {
    tooltip: { trigger: "axis" as const },
    xAxis: { type: "category" as const, data: Object.keys(projectData).map(k => t(`project.status.${k}`) || k) },
    yAxis: { type: "value" as const },
    series: [{ type: "bar" as const, data: Object.values(projectData), itemStyle: { color: "#1677ff" } }],
  };

  // Product creation trend line
  const trendLine = {
    tooltip: { trigger: "axis" as const },
    xAxis: { type: "category" as const, data: trendData.map((d: Record<string, unknown>) => d.date) },
    yAxis: { type: "value" as const },
    series: [{ type: "line" as const, data: trendData.map((d: Record<string, unknown>) => d.count), smooth: true, itemStyle: { color: "#52c41a" } }],
  };

  // Issue severity distribution pie
  const issuePie = {
    tooltip: { trigger: "item" as const },
    legend: { bottom: 0 },
    series: [{
      type: "pie" as const,
      radius: "70%",
      data: issueData.map((d: Record<string, unknown>) => ({
        name: d.severity as string, value: d.count as number,
      })),
    }],
  };

  const totalProducts = Object.values(statusData).reduce((a: number, b: unknown) => a + (b as number), 0) || 0;

  return (
    <div>
      <Typography.Title level={4}>{t("menu.analytics")}</Typography.Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Products" value={totalProducts} prefix={<AppstoreOutlined />} valueStyle={{ color: "#1677ff" }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Tasks" value={taskData.total || 0} prefix={<ProjectOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Completed Tasks" value={taskData.completed || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Blocked Tasks" value={taskData.blocked || 0} prefix={<WarningOutlined />} valueStyle={{ color: "#ff4d4f" }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Products by Lifecycle">
            {Object.keys(statusData).length > 0 ? <ReactECharts option={statusPie} style={{ height: 300 }} /> : <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Projects by Status">
            {Object.keys(projectData).length > 0 ? <ReactECharts option={projectBar} style={{ height: 300 }} /> : <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Product Creation Trend">
            {trendData.length > 0 ? <ReactECharts option={trendLine} style={{ height: 300 }} /> : <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Issue Severity Distribution">
            {issueData.length > 0 ? <ReactECharts option={issuePie} style={{ height: 300 }} /> : <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
