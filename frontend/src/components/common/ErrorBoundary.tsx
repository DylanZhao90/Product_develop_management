import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button, Result, Typography, Space } from "antd";
import { ReloadOutlined, BugOutlined } from "@ant-design/icons";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Reusable ErrorBoundary component.
 * Catches React render errors and displays a friendly UI with retry.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error("[ErrorBoundary] Caught render error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
            padding: 48,
          }}
          role="alert"
        >
          <Result
            status="error"
            title="Something went wrong"
            subTitle={
              <Space direction="vertical" size={8}>
                <Typography.Text type="secondary">
                  An unexpected error occurred while rendering this page.
                </Typography.Text>
                {(import.meta.env.DEV) && this.state.error && (
                  <Typography.Paragraph
                    type="danger"
                    style={{
                      maxWidth: 600,
                      fontSize: 12,
                      background: "#fef2f2",
                      padding: 12,
                      borderRadius: 8,
                      margin: 0,
                      textAlign: "left",
                      wordBreak: "break-word",
                    }}
                  >
                    <BugOutlined style={{ marginRight: 6 }} />
                    {this.state.error.message}
                    <br />
                    {this.state.error.stack?.split("\n").slice(0, 3).join("\n")}
                  </Typography.Paragraph>
                )}
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={this.handleRetry}
                aria-label="Retry loading this page"
              >
                Retry
              </Button>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component wrapper for ErrorBoundary.
 */
export function withErrorBoundary<P extends object>(
  Component_: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component_ {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${Component_.displayName || Component_.name || "Component"})`;
  return Wrapped;
}

export default ErrorBoundary;
