import { Empty, Table, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { monitorApi } from "../api/client";

export function ErrorsPage({ applicationId }: { applicationId: string }) {
  const query = useQuery({ queryKey: ["errors", applicationId], queryFn: () => monitorApi.errors(applicationId), enabled: Boolean(applicationId) });
  if (!applicationId) return <Empty description="请先选择应用" />;
  return (
    <section>
      <Typography.Title level={3}>错误监控</Typography.Title>
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data ?? []}
        expandable={{ expandedRowRender: (row) => <pre className="stack">{row.mappedStack || row.stack || "暂无堆栈"}</pre> }}
        columns={[
          { title: "错误", dataIndex: "name", width: 180 },
          { title: "消息", dataIndex: "message", ellipsis: true },
          { title: "页面", dataIndex: "url", ellipsis: true },
          { title: "版本", dataIndex: "release", width: 140 },
          { title: "时间", dataIndex: "occurredAt", width: 220 }
        ]}
      />
    </section>
  );
}
