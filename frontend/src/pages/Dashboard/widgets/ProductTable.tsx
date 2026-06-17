/**
 * ProductTable — displays a compact product list fetched from the API.
 */
import { Typography, Tag, Skeleton, Empty, Alert } from "antd";
import { useQuery } from "@tanstack/react-query";
import { productApi } from "../../../services/api";
import type { Product } from "../../../services/api-types";

// ── Status metadata helper ──

const STATUS_META_COLORS: Record<string, string> = {
  in_development:  "blue",
  trial_handover:  "orange",
  on_sale:         "green",
  discontinued:    "red",
  eol:             "default",
};

function getStatusMeta(t: (key: string) => string): Record<string, { color: string; label: string }> {
  return {
    in_development:  { color: STATUS_META_COLORS.in_development,  label: t("product.status.in_development") },
    trial_handover:  { color: STATUS_META_COLORS.trial_handover,  label: t("product.status.trial_handover") },
    on_sale:         { color: STATUS_META_COLORS.on_sale,         label: t("product.status.on_sale") },
    discontinued:    { color: STATUS_META_COLORS.discontinued,    label: t("product.status.discontinued") },
    eol:             { color: STATUS_META_COLORS.eol,             label: t("product.status.eol") },
  };
}

interface ProductTableProps {
  t: (key: string) => string;
}

export default function ProductTable({ t }: ProductTableProps) {
  const meta = getStatusMeta(t);

  const { data: productsResp, isLoading, isError } = useQuery({
    queryKey: ["dashboard-products"],
    queryFn: () => productApi.list({ page_size: 10 }),
  });

  const products = productsResp?.data?.data ?? [];

  if (isLoading) {
    return (
      <div style={{ padding: 16 }}>
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  }

  if (isError) {
    return <Alert message="加载产品列表失败" type="error" showIcon style={{ margin: 16 }} />;
  }

  if (products.length === 0) {
    return <Empty description="暂无产品数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--color-border-light)" }}>
            {t("product.code")}
          </th>
          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--color-border-light)" }}>
            {t("product.model")}
          </th>
          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--color-border-light)" }}>
            {t("product.type")}
          </th>
          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--color-border-light)" }}>
            {t("common.lifecycle")}
          </th>
          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--color-border-light)" }}>
            {t("product.targetMarkets")}
          </th>
        </tr>
      </thead>
      <tbody>
        {products.map((p: Product) => {
          const m = meta[p.lifecycle_status] || { color: "default", label: p.lifecycle_status };
          return (
            <tr key={p.id}>
              <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--color-border-light)" }}>
                <Typography.Text strong style={{ fontSize: 13 }}>{p.code}</Typography.Text>
              </td>
              <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--color-border-light)" }}>
                {p.model}
              </td>
              <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--color-border-light)" }}>
                {p.type}
              </td>
              <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--color-border-light)" }}>
                <Tag color={m.color}>{m.label}</Tag>
              </td>
              <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--color-border-light)" }}>
                {p.target_markets?.join(", ") || "-"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
