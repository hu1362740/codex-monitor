import { App as AntApp, Button, Card, Empty, Form, Input, Space, Typography, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useState } from "react";
import type { Application } from "../api/types";
import { monitorApi } from "../api/client";

export function AppConfigPage({ application }: { application?: Application }) {
  const { message } = AntApp.useApp();
  const [file, setFile] = useState<File>();

  if (!application) return <Empty description="请先选择应用" />;

  const snippet = `import { initMonitor } from "@codex-monitor/sdk";

initMonitor({
  appKey: "${application.appKey}",
  endpoint: "http://localhost:3000/api/collect",
  release: "1.0.0",
  environment: "${application.environment}"
});`;

  return (
    <section>
      <Typography.Title level={3}>应用配置</Typography.Title>
      <div className="two-column">
        <Card title="SDK 接入">
          <Space direction="vertical" className="full">
            <Typography.Text>App Key</Typography.Text>
            <Typography.Text code copyable>{application.appKey}</Typography.Text>
            <Typography.Text>接入代码</Typography.Text>
            <pre className="code">{snippet}</pre>
          </Space>
        </Card>
        <Card title="Sourcemap 上传">
          <Form
            layout="vertical"
            onFinish={async (values) => {
              if (!file) {
                message.warning("请选择 sourcemap 文件");
                return;
              }
              await monitorApi.uploadSourcemap({ applicationId: application.id, release: values.release, sourceRoot: values.sourceRoot, file });
              message.success("上传成功");
            }}
          >
            <Form.Item name="release" label="Release" rules={[{ required: true }]} initialValue="1.0.0">
              <Input />
            </Form.Item>
            <Form.Item name="sourceRoot" label="源码根路径">
              <Input placeholder="webpack://src" />
            </Form.Item>
            <Upload beforeUpload={(next) => { setFile(next); return false; }} maxCount={1}>
              <Button icon={<UploadOutlined />}>选择 .map 文件</Button>
            </Upload>
            <Button className="form-submit" type="primary" htmlType="submit">上传</Button>
          </Form>
        </Card>
      </div>
    </section>
  );
}
