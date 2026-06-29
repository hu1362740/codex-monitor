import { Empty, Table, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { monitorApi } from "../api/client";

export function PerformancePage({ applicationId }: { applicationId: string }) {
  const query = useQuery({ queryKey: ["performance", applicationId], queryFn: () => monitorApi.performance(applicationId), enabled: Boolean(applicationId) });
  if (!applicationId) return <Empty description="请先选择应用" />;
  return (
    <section>
      <Typography.Title level={3}>性能监控</Typography.Title>
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data ?? []}
        columns={[
          { title: "指标", dataIndex: "name", width: 160 },
          { title: "数值", dataIndex: "value", width: 120 },
          { title: "耗时(ms)", dataIndex: "duration", width: 120, render: (v) => (v ? Number(v).toFixed(1) : "-") },
          { title: "状态码", dataIndex: "status", width: 100 },
          { title: "页面", dataIndex: "url", ellipsis: true },
          { title: "时间", dataIndex: "occurredAt", width: 220 }
        ]}
      />
    </section>
  );
}
