/**
 * ActivityFeed — displays recent project and task activity from dashboard stats.
 */
import { Skeleton, Empty } from "antd";
import type { DashboardStats } from "../../../services/api-types";

const DOT_COLORS: Record<string, string> = {
  success: "#22C55E",
  warning: "#F59E0B",
  error:   "#EF4444",
  info:    "#6366F1",
};

interface ActivityFeedProps {
  stats?: DashboardStats;
  loading: boolean;
}

export default function ActivityFeed({ stats, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  if (!stats) {
    return <Empty description="暂无动态数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const items: { text: string; time: string; type: "success" | "info" | "warning" | "error" }[] = [];

  if (stats.recent_projects) {
    stats.recent_projects.forEach((p) => {
      items.push({
        text: `项目「${p.name}」状态：${p.status}`,
        time: p.created_at ? new Date(p.created_at).toLocaleDateString() : "最近",
        type: "info",
      });
    });
  }

  if (stats.recent_tasks) {
    stats.recent_tasks.forEach((t) => {
      items.push({
        text: `任务「${t.name}」状态：${t.status}`,
        time: t.created_at ? new Date(t.created_at).toLocaleDateString() : "最近",
        type: t.status === "completed" ? "success" : "warning",
      });
    });
  }

  if (items.length === 0) {
    return <Empty description="暂无动态数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <ul className="pdm-activity-list">
      {items.map((a, i) => (
        <li className="pdm-activity-item" key={i}>
          <span
            className="pdm-activity-dot"
            style={{ background: DOT_COLORS[a.type], boxShadow: `0 0 6px ${DOT_COLORS[a.type]}` }}
          />
          <span className="pdm-activity-text">{a.text}</span>
          <span className="pdm-activity-time">{a.time}</span>
        </li>
      ))}
    </ul>
  );
}
