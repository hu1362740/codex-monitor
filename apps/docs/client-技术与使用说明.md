# Client 子项目技术与使用说明

## 1. 项目定位

`apps/client` 是 Codex Monitor 的前端控制台，面向系统使用者提供项目管理、应用配置、监控看板、错误分析、性能分析、行为分析和告警配置能力。

## 2. 技术栈

- React 19
- Vite 6
- TypeScript
- Ant Design 5
- ECharts
- TanStack Query
- Axios
- React Router
- lucide-react

## 3. 目录结构

```text
apps/client
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
└─ src
   ├─ main.tsx
   ├─ App.tsx
   ├─ api
   │  ├─ client.ts
   │  └─ types.ts
   ├─ components
   │  └─ Chart.tsx
   ├─ pages
   │  ├─ LoginPage.tsx
   │  ├─ ProjectsPage.tsx
   │  ├─ AppConfigPage.tsx
   │  ├─ DashboardPage.tsx
   │  ├─ ErrorsPage.tsx
   │  ├─ PerformancePage.tsx
   │  ├─ BehaviorPage.tsx
   │  └─ AlertsPage.tsx
   └─ styles
      └─ global.css
```

## 4. 页面说明

### 登录 / 注册

文件：`src/pages/LoginPage.tsx`

能力：

- 用户登录。
- 用户注册。
- 登录成功后保存 JWT 到 `localStorage`。
- 默认填入 seed 账号，便于本地演示。

### 项目管理

文件：`src/pages/ProjectsPage.tsx`

能力：

- 创建项目。
- 创建应用。
- 查看项目 ID、应用名称和 appKey。

### 应用配置

文件：`src/pages/AppConfigPage.tsx`

能力：

- 展示 appKey。
- 展示 SDK 接入代码。
- 上传 sourcemap。

### 总览看板

文件：`src/pages/DashboardPage.tsx`

能力：

- 展示 PV、UV、错误数、接口失败率。
- 展示 Web Vitals 图表。
- 展示 Top 错误。

### 错误监控

文件：`src/pages/ErrorsPage.tsx`

能力：

- 查看错误列表。
- 展开查看原始 stack 或 mappedStack。
- 查看页面 URL、release 和发生时间。

### 性能监控

文件：`src/pages/PerformancePage.tsx`

能力：

- 查看 Web Vitals。
- 查看接口耗时。
- 查看接口状态码。

### 行为分析

文件：`src/pages/BehaviorPage.tsx`

能力：

- 查看 PV、点击、自定义事件。
- 查看目标 DOM 路径和页面 URL。

### 告警中心

文件：`src/pages/AlertsPage.tsx`

能力：

- 创建告警规则。
- 查看规则启用状态。
- 查看最近触发记录。

## 5. API 封装

文件：`src/api/client.ts`

统一 Axios 实例：

- `baseURL` 使用 `VITE_API_BASE_URL`，默认 `http://localhost:3000/api`。
- 请求自动从 `localStorage` 读取 `codex-monitor-token` 并设置 Authorization。
- 暴露 `monitorApi` 方法供页面调用。

主要方法：

- `login`
- `register`
- `projects`
- `createProject`
- `createApplication`
- `overview`
- `errors`
- `performance`
- `behavior`
- `alertRules`
- `createAlertRule`
- `uploadSourcemap`

## 6. 本地运行

```bash
pnpm --filter @codex-monitor/client dev
```

访问：

```text
http://localhost:5173
```

## 7. 构建

```bash
pnpm --filter @codex-monitor/client build
```

## 8. 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:3000/api` | Server API 地址 |

## 9. 开发规范

- 页面通过 TanStack Query 获取服务端状态。
- 新增 API 必须先扩展 `src/api/types.ts` 和 `src/api/client.ts`。
- 管理后台 UI 以信息密度和可扫描性优先。
- 新增图表优先复用 `Chart` 组件。
- 不在页面组件中重复拼接 Authorization。

## 10. 常见问题

### 登录后仍回到登录页

检查 `localStorage` 是否保存 `codex-monitor-token`，以及 Server 是否返回 `accessToken`。

### 页面没有应用可选

先进入“项目管理”创建项目和应用，或执行 Server 的 seed。

### sourcemap 上传失败

确认：

- 已选择应用。
- 已登录。
- 上传文件字段为 `.map` 文件。
- Server 上传大小限制未超过 20 MB。

