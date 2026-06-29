import { App as AntApp, Button, Layout, Menu, Select, Space, Typography } from "antd";
import { Activity, Bell, Bug, Gauge, MousePointerClick, Settings } from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { monitorApi } from "./api/client";
import { AlertsPage } from "./pages/AlertsPage";
import { AppConfigPage } from "./pages/AppConfigPage";
import { BehaviorPage } from "./pages/BehaviorPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ErrorsPage } from "./pages/ErrorsPage";
import { LoginPage } from "./pages/LoginPage";
import { PerformancePage } from "./pages/PerformancePage";
import { ProjectsPage } from "./pages/ProjectsPage";

const { Header, Sider, Content } = Layout;

function ConsoleLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = AntApp.useApp();
  const [applicationId, setApplicationId] = useState<string>(() => localStorage.getItem("codex-monitor-app") ?? "");
  const projects = useQuery({ queryKey: ["projects"], queryFn: monitorApi.projects });

  const applications = useMemo(() => projects.data?.flatMap((project) => project.applications) ?? [], [projects.data]);
  const selectedApp = applications.find((app) => app.id === applicationId) ?? applications[0];
  const activeApplicationId = selectedApp?.id ?? "";

  if (!localStorage.getItem("codex-monitor-token")) {
    return <Navigate to="/login" replace />;
  }

  const selectApp = (value: string) => {
    setApplicationId(value);
    localStorage.setItem("codex-monitor-app", value);
    message.success("已切换应用");
  };

  const menuItems = [
    { key: "/dashboard", icon: <Activity size={16} />, label: "总览" },
    { key: "/errors", icon: <Bug size={16} />, label: "错误监控" },
    { key: "/performance", icon: <Gauge size={16} />, label: "性能监控" },
    { key: "/behavior", icon: <MousePointerClick size={16} />, label: "行为分析" },
    { key: "/alerts", icon: <Bell size={16} />, label: "告警中心" },
    { key: "/app-config", icon: <Settings size={16} />, label: "应用配置" },
    { key: "/projects", icon: <Settings size={16} />, label: "项目管理" }
  ];

  return (
    <Layout className="shell">
      <Sider width={220} className="sider">
        <div className="brand">Codex Monitor</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={(item) => navigate(item.key)}
        />
      </Sider>
      <Layout>
        <Header className="topbar">
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{selectedApp?.name ?? "暂无应用"}</Typography.Text>
            <Typography.Text type="secondary">{selectedApp?.environment ?? "请先创建项目和应用"}</Typography.Text>
          </Space>
          <Space>
            <Select
              className="app-select"
              placeholder="选择应用"
              value={activeApplicationId || undefined}
              options={applications.map((app) => ({ label: app.name, value: app.id }))}
              onChange={selectApp}
            />
            <Button
              onClick={() => {
                localStorage.removeItem("codex-monitor-token");
                navigate("/login");
              }}
            >
              退出
            </Button>
          </Space>
        </Header>
        <Content className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage applicationId={activeApplicationId} />} />
            <Route path="/errors" element={<ErrorsPage applicationId={activeApplicationId} />} />
            <Route path="/performance" element={<PerformancePage applicationId={activeApplicationId} />} />
            <Route path="/behavior" element={<BehaviorPage applicationId={activeApplicationId} />} />
            <Route path="/alerts" element={<AlertsPage applicationId={activeApplicationId} />} />
            <Route path="/app-config" element={<AppConfigPage application={selectedApp} />} />
            <Route path="/projects" element={<ProjectsPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<ConsoleLayout />} />
    </Routes>
  );
}
