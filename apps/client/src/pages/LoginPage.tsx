import { Button, Card, Form, Input, Segmented, Typography, App as AntApp } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { monitorApi } from "../api/client";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  async function submit(values: { email: string; name?: string; password: string }) {
    setLoading(true);
    try {
      if (mode === "login") {
        await monitorApi.login(values.email, values.password);
      } else {
        await monitorApi.register({ email: values.email, name: values.name ?? values.email, password: values.password });
      }
      navigate("/dashboard");
    } catch {
      message.error("认证失败，请检查输入");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <Typography.Title level={2}>Codex Monitor</Typography.Title>
        <Segmented
          block
          value={mode}
          options={[
            { label: "登录", value: "login" },
            { label: "注册", value: "register" }
          ]}
          onChange={(value) => setMode(value as "login" | "register")}
        />
        <Form layout="vertical" onFinish={submit} initialValues={{ email: "admin@example.com", password: "admin123456" }}>
          {mode === "register" && (
            <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          )}
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {mode === "login" ? "登录" : "注册并登录"}
          </Button>
        </Form>
      </Card>
    </main>
  );
}
