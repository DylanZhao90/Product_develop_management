import React from "react";
import { Breadcrumb, Typography, Space, Button } from "antd";
import { HomeOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useLocale } from "../../locales";

interface BreadcrumbItem {
  title: string;
  path?: string;
}

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Breadcrumb items (auto-prepends Home) */
  breadcrumbs?: BreadcrumbItem[];
  /** Action buttons rendered on the right side */
  extra?: React.ReactNode;
  /** Show back button */
  showBack?: boolean;
  /** Back button destination path or callback */
  backPath?: string;
}

/**
 * Reusable PageHeader component with breadcrumbs, title, and action area.
 * Provides consistent page heading across all pages.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  extra,
  showBack,
  backPath,
}) => {
  const navigate = useNavigate();
  const { t } = useLocale();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { title: <HomeOutlined />, path: "/" },
    ...(breadcrumbs || []),
  ];

  return (
    <div
      style={{
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div>
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb
            items={breadcrumbItems.map((item) => ({
              title: item.path ? (
                <a
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.path!);
                  }}
                  aria-label={`Navigate to ${item.title}`}
                >
                  {item.title}
                </a>
              ) : (
                <span>{item.title}</span>
              ),
            }))}
            style={{ marginBottom: 8 }}
          />
        )}

        {/* Title row */}
        <Space size={12} align="center">
          {showBack && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              aria-label={t("common.back") || "Back"}
              style={{ color: "var(--color-text-secondary)" }}
            />
          )}
          <div>
            <Typography.Title
              level={4}
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.3px",
              }}
            >
              {title}
            </Typography.Title>
            {subtitle && (
              <Typography.Text
                type="secondary"
                style={{ fontSize: 14, marginTop: 4, display: "block" }}
              >
                {subtitle}
              </Typography.Text>
            )}
          </div>
        </Space>
      </div>

      {/* Action buttons */}
      {extra && <Space size={8}>{extra}</Space>}
    </div>
  );
};

export default PageHeader;
