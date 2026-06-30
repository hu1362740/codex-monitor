import { App as AntApp, Button, Card, Form, Input, List, Select, Space, Typography } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import type { Application, Project } from "../api/types";
import { monitorApi } from "../api/client";

interface CreateProjectFormValues {
  name: string;
  description?: string;
}

interface CreateApplicationFormValues {
  projectId: string;
  name: string;
  environment?: string;
  allowedDomains: string;
}

/**
 * @description 从后端或网络异常中提取适合直接展示给用户的错误提示。
 * @param error unknown，接口请求抛出的原始异常。
 * @param fallback string，无法识别异常结构时使用的默认提示。
 * @returns string，页面消息组件可展示的错误文本。
 */
function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      return message.join("；");
    }
    if (message) {
      return message;
    }
  }

  return fallback;
}

/**
 * @description 将逗号分隔的域名输入转换为接口需要的数组结构。
 * @param value string，用户在“允许域名”输入框中填写的原始文本。
 * @returns string[]，去除空白和空项后的域名列表。
 */
function parseAllowedDomains(value: string) {
  const domains: string[] = [];

  // 用户可能输入连续逗号或尾随逗号，这里过滤空项避免服务端保存无效域名。
  for (const item of value.split(",")) {
    const domain = item.trim();
    if (domain) {
      domains.push(domain);
    }
  }

  return domains;
}

/**
 * @description 将项目转换为 Ant Design Select 组件需要的选项结构。
 * @param project Project，当前登录用户拥有的项目。
 * @returns { label: string; value: string }，项目下拉选项。
 */
function toProjectOption(project: Project) {
  return {
    label: project.name,
    value: project.id
  };
}

/**
 * @description 渲染项目下的应用摘要，突出应用名称和 SDK 上报使用的 appKey。
 * @param app Application，项目下的单个应用。
 * @returns JSX.Element，应用摘要节点。
 */
function renderApplication(app: Application) {
  return (
    <Typography.Text key={app.id}>
      {app.name} <Typography.Text code>{app.appKey}</Typography.Text>
    </Typography.Text>
  );
}

/**
 * @description 渲染项目列表项，展示项目 ID、描述和项目下所有应用。
 * @param project Project，列表中的单个项目。
 * @returns JSX.Element，项目列表项节点。
 */
function renderProject(project: Project) {
  return (
    <List.Item>
      <List.Item.Meta
        title={
          <Space>
            <span>{project.name}</span>
            <Typography.Text code>{project.id}</Typography.Text>
          </Space>
        }
        description={project.description}
      />
      <Space direction="vertical" align="end">
        {project.applications.map(renderApplication)}
      </Space>
    </List.Item>
  );
}

/**
 * @description 提供项目创建、应用创建和项目应用列表查看能力。
 * @returns JSX.Element，项目管理页面。
 */
export function ProjectsPage() {
  const { message } = AntApp.useApp();
  const client = useQueryClient();
  const [projectForm] = Form.useForm<CreateProjectFormValues>();
  const [applicationForm] = Form.useForm<CreateApplicationFormValues>();
  const projects = useQuery({ queryKey: ["projects"], queryFn: monitorApi.projects });
  const projectOptions = (projects.data ?? []).map(toProjectOption);

  /**
   * @description 处理项目创建成功后的提示、表单重置和列表刷新。
   * @returns void，无返回值。
   */
  function handleProjectCreated() {
    message.success("项目已创建");
    projectForm.resetFields();
    void client.invalidateQueries({ queryKey: ["projects"] });
  }

  /**
   * @description 处理项目创建失败后的错误提示。
   * @param error unknown，创建项目接口抛出的异常。
   * @returns void，无返回值。
   */
  function handleProjectCreateFailed(error: unknown) {
    message.error(getErrorMessage(error, "项目创建失败"));
  }

  /**
   * @description 处理应用创建成功后的提示、表单重置和列表刷新。
   * @returns void，无返回值。
   */
  function handleApplicationCreated() {
    message.success("应用已创建");
    applicationForm.resetFields();
    void client.invalidateQueries({ queryKey: ["projects"] });
  }

  /**
   * @description 处理应用创建失败后的错误提示。
   * @param error unknown，创建应用接口抛出的异常。
   * @returns void，无返回值。
   */
  function handleApplicationCreateFailed(error: unknown) {
    message.error(getErrorMessage(error, "应用创建失败"));
  }

  const createProject = useMutation({
    mutationFn: monitorApi.createProject,
    onSuccess: handleProjectCreated,
    onError: handleProjectCreateFailed
  });
  const createApp = useMutation({
    mutationFn: monitorApi.createApplication,
    onSuccess: handleApplicationCreated,
    onError: handleApplicationCreateFailed
  });

  /**
   * @description 提交创建项目表单。
   * @param values CreateProjectFormValues，项目名称和可选描述。
   * @returns void，无返回值。
   */
  function handleCreateProject(values: CreateProjectFormValues) {
    createProject.mutate(values);
  }

  /**
   * @description 提交创建应用表单，并把域名文本转换为接口字段。
   * @param values CreateApplicationFormValues，应用创建表单数据。
   * @returns void，无返回值。
   */
  function handleCreateApplication(values: CreateApplicationFormValues) {
    createApp.mutate({
      projectId: values.projectId,
      name: values.name,
      environment: values.environment,
      allowedDomains: parseAllowedDomains(values.allowedDomains)
    });
  }

  return (
    <section>
      <Typography.Title level={3}>项目管理</Typography.Title>
      <div className="two-column">
        <Card title="创建项目">
          <Form form={projectForm} layout="vertical" onFinish={handleCreateProject}>
            <Form.Item name="name" label="项目名称" rules={[{ required: true, message: "请输入项目名称" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={createProject.isPending}>
              创建
            </Button>
          </Form>
        </Card>
        <Card title="创建应用">
          <Form
            form={applicationForm}
            layout="vertical"
            initialValues={{ environment: "production", allowedDomains: "localhost,127.0.0.1" }}
            onFinish={handleCreateApplication}
          >
            <Form.Item name="projectId" label="所属项目" rules={[{ required: true, message: "请选择所属项目" }]}>
              <Select
                loading={projects.isLoading}
                placeholder="请选择项目"
                options={projectOptions}
                disabled={projectOptions.length === 0}
              />
            </Form.Item>
            <Form.Item name="name" label="应用名称" rules={[{ required: true, message: "请输入应用名称" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="environment" label="环境">
              <Input />
            </Form.Item>
            <Form.Item name="allowedDomains" label="允许域名">
              <Input />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={createApp.isPending} disabled={projectOptions.length === 0}>
              创建应用
            </Button>
          </Form>
        </Card>
      </div>
      <List className="project-list" loading={projects.isLoading} dataSource={projects.data ?? []} renderItem={renderProject} />
    </section>
  );
}
