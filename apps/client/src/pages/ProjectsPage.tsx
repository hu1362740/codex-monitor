import { App as AntApp, Button, Card, Form, Input, List, Space, Typography } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { monitorApi } from "../api/client";

export function ProjectsPage() {
  const { message } = AntApp.useApp();
  const client = useQueryClient();
  const projects = useQuery({ queryKey: ["projects"], queryFn: monitorApi.projects });
  const createProject = useMutation({
    mutationFn: monitorApi.createProject,
    onSuccess: () => {
      message.success("项目已创建");
      void client.invalidateQueries({ queryKey: ["projects"] });
    }
  });
  const createApp = useMutation({
    mutationFn: monitorApi.createApplication,
    onSuccess: () => {
      message.success("应用已创建");
      void client.invalidateQueries({ queryKey: ["projects"] });
    }
  });

  return (
    <section>
      <Typography.Title level={3}>项目管理</Typography.Title>
      <div className="two-column">
        <Card title="创建项目">
          <Form layout="vertical" onFinish={(values) => createProject.mutate(values)}>
            <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={createProject.isPending}>创建</Button>
          </Form>
        </Card>
        <Card title="创建应用">
          <Form
            layout="vertical"
            onFinish={(values) => createApp.mutate({ ...values, allowedDomains: values.allowedDomains.split(",").map((item: string) => item.trim()) })}
          >
            <Form.Item name="projectId" label="项目 ID" rules={[{ required: true }]}>
              <Input placeholder="从右侧项目列表复制" />
            </Form.Item>
            <Form.Item name="name" label="应用名称" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="environment" label="环境" initialValue="production">
              <Input />
            </Form.Item>
            <Form.Item name="allowedDomains" label="允许域名" initialValue="localhost,127.0.0.1">
              <Input />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={createApp.isPending}>创建应用</Button>
          </Form>
        </Card>
      </div>
      <List
        className="project-list"
        loading={projects.isLoading}
        dataSource={projects.data ?? []}
        renderItem={(project) => (
          <List.Item>
            <List.Item.Meta
              title={<Space><span>{project.name}</span><Typography.Text code>{project.id}</Typography.Text></Space>}
              description={project.description}
            />
            <Space direction="vertical" align="end">
              {project.applications.map((app) => (
                <Typography.Text key={app.id}>{app.name} <Typography.Text code>{app.appKey}</Typography.Text></Typography.Text>
              ))}
            </Space>
          </List.Item>
        )}
      />
    </section>
  );
}
