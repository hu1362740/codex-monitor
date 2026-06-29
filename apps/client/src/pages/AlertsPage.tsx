import { App as AntApp, Button, Card, Empty, Form, Input, InputNumber, Select, Switch, Table, Typography } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { monitorApi } from "../api/client";

export function AlertsPage({ applicationId }: { applicationId: string }) {
  const { message } = AntApp.useApp();
  const client = useQueryClient();
  const rules = useQuery({ queryKey: ["alerts", applicationId], queryFn: () => monitorApi.alertRules(applicationId), enabled: Boolean(applicationId) });
  const create = useMutation({
    mutationFn: monitorApi.createAlertRule,
    onSuccess: () => {
      message.success("告警规则已创建");
      void client.invalidateQueries({ queryKey: ["alerts", applicationId] });
    }
  });

  if (!applicationId) return <Empty description="请先选择应用" />;

  return (
    <section>
      <Typography.Title level={3}>告警中心</Typography.Title>
      <Card title="创建规则" className="section-card">
        <Form
          layout="inline"
          onFinish={(values) => create.mutate({ ...values, applicationId })}
          initialValues={{ metric: "error_count", operator: "gte", durationMin: 5, channel: "webhook" }}
        >
          <Form.Item name="name" rules={[{ required: true }]}>
            <Input placeholder="规则名称" />
          </Form.Item>
          <Form.Item name="metric">
            <Select className="field-md" options={[
              { label: "错误数", value: "error_count" },
              { label: "错误率", value: "error_rate" },
              { label: "接口失败率", value: "api_failure_rate" },
              { label: "LCP", value: "lcp" }
            ]} />
          </Form.Item>
          <Form.Item name="operator">
            <Select className="field-sm" options={[{ label: ">=", value: "gte" }, { label: ">", value: "gt" }, { label: "<=", value: "lte" }, { label: "<", value: "lt" }]} />
          </Form.Item>
          <Form.Item name="threshold">
            <InputNumber placeholder="阈值" />
          </Form.Item>
          <Form.Item name="durationMin">
            <InputNumber placeholder="分钟" />
          </Form.Item>
          <Form.Item name="channel">
            <Select className="field-md" options={[{ label: "Webhook", value: "webhook" }, { label: "邮件", value: "email" }]} />
          </Form.Item>
          <Form.Item name="target" rules={[{ required: true }]}>
            <Input placeholder="通知地址" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={create.isPending}>创建</Button>
        </Form>
      </Card>
      <Table
        rowKey="id"
        loading={rules.isLoading}
        dataSource={rules.data ?? []}
        columns={[
          { title: "名称", dataIndex: "name" },
          { title: "指标", dataIndex: "metric" },
          { title: "条件", render: (_, row) => `${row.operator} ${row.threshold}` },
          { title: "渠道", dataIndex: "channel" },
          { title: "状态", dataIndex: "enabled", render: (enabled) => <Switch checked={enabled} disabled /> },
          { title: "最近触发", render: (_, row) => row.records?.[0]?.message ?? "-" }
        ]}
      />
    </section>
  );
}
