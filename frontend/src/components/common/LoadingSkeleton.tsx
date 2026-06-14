import React from "react";
import { Card, Skeleton, Space, Row, Col } from "antd";

interface LoadingSkeletonProps {
  /** Number of skeleton rows to show */
  rows?: number;
  /** Show card wrapper */
  card?: boolean;
  /** Show as a table-like skeleton */
  table?: boolean;
  /** Show as a detail page skeleton (descriptions + cards) */
  detail?: boolean;
  /** Show as stat card skeletons */
  stats?: number;
  /** Custom extra content inside the skeleton area */
  children?: React.ReactNode;
}

/**
 * Reusable loading skeleton component.
 * Supports multiple modes: default (paragraph), table, detail, stats.
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  rows = 3,
  card = true,
  table = false,
  detail = false,
  stats = 0,
  children,
}) => {
  // Stats skeleton
  if (stats > 0) {
    return (
      <Row gutter={[16, 16]} role="status" aria-label="Loading statistics">
        {Array.from({ length: stats }).map((_, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card aria-hidden="true">
              <Skeleton active paragraph={{ rows: 1 }} title={{ width: "60%" }} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  // Detail page skeleton
  if (detail) {
    return (
      <div role="status" aria-label="Loading page content">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {/* Title */}
          <Skeleton active title={{ width: "40%" }} paragraph={false} />
          {/* Action buttons */}
          <Skeleton.Button active size="small" style={{ width: 80, marginRight: 8 }} />
          <Skeleton.Button active size="small" style={{ width: 100 }} />
          {/* Detail card */}
          <Card aria-hidden="true">
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
          {/* Additional cards */}
          <Card aria-hidden="true">
            <Skeleton active paragraph={{ rows: 3 }} />
          </Card>
        </Space>
      </div>
    );
  }

  // Table skeleton
  if (table) {
    return (
      <div role="status" aria-label="Loading table data">
        <Card aria-hidden="true">
          <Skeleton active paragraph={{ rows: 1 }} title={{ width: "30%" }} />
          <div style={{ marginTop: 16 }}>
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton
                key={i}
                active
                title={false}
                paragraph={{ rows: 1, width: i === 0 ? "98%" : `${90 - i * 10}%` }}
                style={{ marginBottom: 12 }}
              />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // Default card skeleton
  const content = (
    <>
      <Skeleton active title={{ width: "40%" }} paragraph={{ rows }} />
      {children}
    </>
  );

  if (card) {
    return (
      <div role="status" aria-label="Loading content">
        <Card aria-hidden="true">{content}</Card>
      </div>
    );
  }

  return <div role="status" aria-label="Loading content">{content}</div>;
};

/**
 * Page-level loading skeleton with breadcrumb placeholder.
 */
export const PageSkeleton: React.FC<{ rows?: number; detail?: boolean }> = ({
  rows = 3,
  detail = false,
}) => (
  <div>
    {/* Breadcrumb placeholder */}
    <Skeleton
      active
      title={false}
      paragraph={{ rows: 1, width: "30%" }}
      style={{ marginBottom: 16 }}
    />
    <LoadingSkeleton rows={rows} detail={detail} />
  </div>
);

export default LoadingSkeleton;
