import { Empty, Table, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { monitorApi } from "../api/client";

export function BehaviorPage({ applicationId }: { applicationId: string }) {
  const query = useQuery({ queryKey: ["behavior", applicationId], queryFn: () => monitorApi.behavior(applicationId), enabled: Boolean(applicationId) });
  if (!applicationId) return <Empty description="请先选择应用" />;
  return (
    <section>
      <Typography.Title level={3}>行为分析</Typography.Title>
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data ?? []}
        columns={[
          { title: "事件", dataIndex: "name", width: 160 },
          { title: "目标", dataIndex: "target", ellipsis: true },
          { title: "页面", dataIndex: "url", ellipsis: true },
          { title: "时间", dataIndex: "occurredAt", width: 220 }
        ]}
      />
    </section>
  );
}
