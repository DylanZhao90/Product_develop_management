import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  Input,
  Modal,
  ProTable,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from "@/components/common/antd-imports";
import { SearchOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi, projectApi } from "../../services/api";
import { useLocale } from "../../locales";

const statusColors: Record<string, string> = {
  in_development: "blue",
  trial_handover: "orange",
  on_sale: "green",
  discontinued: "red",
  eol: "default",
};

const typeColors: Record<string, string> = {
  ac_charger: "purple",
  dc_charger: "cyan",
  portable: "lime",
};

const stageColorsMap: Record<string, string> = {
  in_development: "blue",
  trial_handover: "orange",
  on_sale: "green",
  discontinued: "red",
  eol: "default",
};

export default function Products() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, search, statusFilter, typeFilter],
    queryFn: () =>
      productApi.list({
        page,
        page_size: 20,
        search: search || undefined,
        status: statusFilter,
        type: typeFilter,
      }),
  });

  const { data: projectsResp } = useQuery({
    queryKey: ["projects-all"],
    queryFn: () => projectApi.list({ page_size: 200 }),
  });

  const projectMap = new Map<string, string>();
  (projectsResp?.data?.data || []).forEach((p: any) => {
    projectMap.set(p.id, p.name);
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: () => {
      message.success(t("common.deleted"));
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const columns = [
    {
      title: t("product.code"),
      dataIndex: "code",
      key: "code",
      width: 160,
    },
    {
      title: t("product.model"),
      dataIndex: "model",
      key: "model",
      width: 160,
    },
    {
      title: t("product.name"),
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: t("product.type"),
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (v: string) => {
        const shortKey = v?.replace('_charger', '');
        return (
          <Tag color={typeColors[v] || typeColors[shortKey] || "default"}>
            {t(`product.typeShort.${shortKey}` as any) || v || "-"}
          </Tag>
        );
      },
    },
    {
      title: t("product.targetMarkets"),
      dataIndex: "target_markets",
      key: "target_markets",
      width: 180,
      render: (v: string[] | null) =>
        Array.isArray(v) && v.length > 0 ? (
          <Space wrap size={4}>
            {v.map((m) => (
              <Tag key={m}>{m}</Tag>
            ))}
          </Space>
        ) : (
          "-"
        ),
    },
    {
      title: t("product.certificationRequirements"),
      dataIndex: "certification_requirements",
      key: "certification_requirements",
      width: 200,
      render: (v: string[] | null) =>
        Array.isArray(v) && v.length > 0 ? (
          <Space wrap size={4}>
            {v.map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
          </Space>
        ) : (
          "-"
        ),
    },
    {
      title: t("common.project"),
      dataIndex: "project_id",
      key: "project_id",
      width: 200,
      render: (v: string) => {
        const name = projectMap.get(v);
        return name ? (
          <Button type="link" size="small" style={{ padding: 0 }} onClick={(e) => { e.stopPropagation(); navigate(`/projects/${v}`); }}>
            {name}
          </Button>
        ) : (
          v || "-"
        );
      },
    },
    {
      title: t("product.status"),
      dataIndex: "lifecycle_status",
      key: "lifecycle_status",
      width: 120,
      render: (v: string) => <Tag color={stageColorsMap[v]}>{t("product.status." + v)}</Tag>,
    },
    {
      title: t("product.description"),
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (v: string) => v || "-",
    },
    {
      title: t("common.created"),
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
    {
      title: t("common.updated"),
      dataIndex: "updated_at",
      key: "updated_at",
      width: 170,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
    {
      title: t("common.actions"),
      key: "action",
      width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Button
          size="small"
          danger
          onClick={(e) => {
            e.stopPropagation();
            Modal.confirm({
              title: t("common.deleteConfirm"),
              content: t("common.deleteWarning"),
              okText: t("common.delete"),
              cancelText: t("common.cancel"),
              okButtonProps: { danger: true },
              onOk: () => deleteMutation.mutate(r.id as string),
            });
          }}
        >
          {t("common.delete")}
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <Typography.Title className="page-header-title" level={4} style={{ margin: 0 }}>
          {t("menu.products")}
        </Typography.Title>
        <Typography.Text className="page-header-desc">
          {t("common.total", { count: data?.data?.total || 0 })}
        </Typography.Text>
      </div>

      {/* Stat Summary Cards */}
      {(() => {
        const rows = data?.data?.data || [];
        const counts = { in_development: 0, trial_handover: 0, on_sale: 0, discontinued: 0, eol: 0 };
        const typeCounts = { ac_charger: 0, dc_charger: 0, portable: 0 };
        rows.forEach((r: any) => {
          const s = r.lifecycle_status as string;
          const t = r.type as string;
          if (s in counts) counts[s as keyof typeof counts]++;
          if (t in typeCounts) typeCounts[t as keyof typeof typeCounts]++;
        });
        return (
          <div style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title={t("common.total", { count: "" }).replace("{count}", "")} value={data?.data?.total || 0} valueStyle={{ color: "#4f6ef6", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title={t("product.status.in_development")} value={counts.in_development} valueStyle={{ color: "#1677ff", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title={t("product.status.trial_handover")} value={counts.trial_handover} valueStyle={{ color: "#fa8c16", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title={t("product.status.on_sale")} value={counts.on_sale} valueStyle={{ color: "#22c55e", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title={t("product.status.discontinued")} value={counts.discontinued} valueStyle={{ color: "#ef4444", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title={t("product.status.eol")} value={counts.eol} valueStyle={{ color: "#8c8c8c", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
            </Row>
            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic
                    title={<span>AC <small style={{ color: "#888", fontWeight: 400 }}>Charger</small></span>}
                    value={typeCounts.ac_charger}
                    valueStyle={{ color: "#722ed1", fontSize: 22, fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic
                    title={<span>DC <small style={{ color: "#888", fontWeight: 400 }}>Charger</small></span>}
                    value={typeCounts.dc_charger}
                    valueStyle={{ color: "#13c2c2", fontSize: 22, fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
                  <Statistic title="Portable" value={typeCounts.portable} valueStyle={{ color: "#a0d911", fontSize: 22, fontWeight: 700 }} />
                </Card>
              </Col>
            </Row>
          </div>
        );
      })()}

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder={t("common.search")}
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder={t("common.status")}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            style={{ width: 140 }}
            options={[
              { label: t("common.all"), value: undefined },
              { label: t("product.status.in_development"), value: "in_development" },
              { label: t("product.status.trial_handover"), value: "trial_handover" },
              { label: t("product.status.on_sale"), value: "on_sale" },
              { label: t("product.status.discontinued"), value: "discontinued" },
              { label: t("product.status.eol"), value: "eol" },
            ]}
          />
          <Select
            placeholder={t("product.type")}
            value={typeFilter}
            onChange={(v) => { setTypeFilter(v); setPage(1); }}
            style={{ width: 140 }}
            options={[
              { label: t("common.all"), value: undefined },
              { label: t("product.type.ac_charger"), value: "ac_charger" },
              { label: t("product.type.dc_charger"), value: "dc_charger" },
              { label: t("product.type.portable"), value: "portable" },
            ]}
          />
        </Space>
        <ProTable
          columns={columns}
          dataSource={data?.data?.data || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.data?.total || 0,
            onChange: setPage,
            showTotal: (total: number) => t("common.total", { count: total }),
          }}
          onRow={(record: { id: string }) => ({
            onClick: () => navigate(`/products/${record.id}`),
            style: { cursor: "pointer" },
          })}
        />
      </Card>
    </div>
  );
}
