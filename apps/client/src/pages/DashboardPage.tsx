import { Card, Col, Empty, Row, Statistic, Table, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { monitorApi } from "../api/client";
import { Chart } from "../components/Chart";

export function DashboardPage({ applicationId }: { applicationId: string }) {
  const overview = useQuery({
    queryKey: ["overview", applicationId],
    queryFn: () => monitorApi.overview(applicationId),
    enabled: Boolean(applicationId)
  });

  if (!applicationId) return <Empty description="请先创建并选择应用" />;

  const data = overview.data;
  return (
    <section>
      <Typography.Title level={3}>总览看板</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col span={6}><Card><Statistic title="今日 PV" value={data?.pv ?? 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="今日 UV" value={data?.uv ?? 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="错误数" value={data?.errors ?? 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="接口失败率" value={(data?.apiFailureRate ?? 0) * 100} precision={2} suffix="%" /></Card></Col>
        <Col span={12}>
          <Card title="Web Vitals">
            <Chart option={{ xAxis: { type: "category", data: data?.vitals.map((v) => v.name) ?? [] }, yAxis: {}, series: [{ type: "bar", data: data?.vitals.map((v) => Number(v.average.toFixed(2))) ?? [] }] }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Top 错误">
            <Table
              rowKey="fingerprint"
              size="small"
              dataSource={data?.topErrors ?? []}
              pagination={false}
              columns={[
                { title: "类型", dataIndex: "name" },
                { title: "消息", dataIndex: "message", ellipsis: true },
                { title: "次数", dataIndex: "_count", render: (count) => count?.fingerprint ?? count }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </section>
  );
}
