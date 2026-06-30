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

用途：

“项目管理”是监控对象的组织与初始化入口，主要解决“我要把哪些业务系统纳入监控、它们归属于哪个业务项目”的问题。用户通常先在这里创建项目，再在项目下创建应用；创建应用成功后，系统会生成应用级 `appKey`，后续 SDK 接入、事件上报、看板查询、告警和 sourcemap 都会围绕这个应用展开。

能力：

- 创建项目。
- 在指定项目下创建应用。
- 设置应用名称、运行环境和允许上报的域名。
- 查看项目 ID、项目描述、应用名称和应用 `appKey`。

适用场景：

- 第一次使用控制台，需要创建业务分组和监控应用。
- 新增一个需要接入监控的站点、前端应用或业务环境。
- 查看已有项目下有哪些应用，以及复制创建应用时需要使用的项目 ID。

### 应用配置

文件：`src/pages/AppConfigPage.tsx`

用途：

“应用配置”是当前已选应用的接入与发布辅助页面，主要解决“这个应用如何接入 SDK、如何让错误堆栈映射回源码”的问题。页面不会创建新的项目或应用，而是读取顶部应用选择器当前选中的应用，并展示该应用的接入信息。

能力：

- 展示 appKey。
- 展示 SDK 接入代码。
- 上传 sourcemap。
- 根据当前应用环境生成 SDK 初始化示例。
- 按应用和 release 保存 sourcemap，用于错误堆栈还原。

适用场景：

- 业务方准备把 SDK 接入到某个已经创建好的应用。
- 需要复制当前应用的 `appKey` 或初始化代码。
- 新版本发布后，需要上传对应 release 的 `.map` 文件以支持错误源码定位。

### 项目与应用的概念区别

在 Codex Monitor 中，“项目”和“应用”是两层不同粒度的资源：

| 概念 | 粒度 | 主要作用 | 关键字段 | 与监控数据的关系 |
| --- | --- | --- | --- | --- |
| 项目 | 业务分组或产品线 | 组织应用，承载归属关系 | `id`、`name`、`description`、`ownerId` | 项目本身不直接接收 SDK 上报数据 |
| 应用 | 具体接入监控的前端实例 | 作为 SDK 上报、看板查询、告警和 sourcemap 的直接对象 | `id`、`name`、`appKey`、`environment`、`allowedDomains` | 事件、性能、行为、错误、告警、sourcemap 都绑定到应用 |

二者关系：

- 一个用户可以拥有多个项目。
- 一个项目可以包含多个应用。
- 一个应用只能归属于一个项目。
- 控制台顶部的“选择应用”决定总览、错误监控、性能监控、行为分析、告警中心和应用配置页面当前查看的数据范围。
- SDK 上报时使用的是应用的 `appKey`，服务端会根据 `appKey` 找到对应应用，再把事件写入该应用名下。

相同点：

- 都是控制台中的业务资源。
- 都由登录用户创建和管理。
- 都用于帮助用户把监控数据按业务归属整理清楚。

不同点：

- 项目偏“管理分组”，用于把多个应用归到同一个业务或产品下面。
- 应用偏“监控实体”，是真正被 SDK 接入和产生监控数据的对象。
- 项目没有 `appKey`，不能直接用于 SDK 初始化；应用拥有唯一 `appKey`，是 SDK 上报身份标识。
- 项目管理页面负责创建和组织资源；应用配置页面负责对已选应用进行 SDK 接入和 sourcemap 配置。

举例：

- “电商平台”可以是一个项目。
- “电商 PC 官网”“电商 H5 页面”“商家后台”可以是该项目下的三个应用。
- 如果同一套前端在 `production`、`staging` 环境需要分别看数据，也可以建成两个应用，用不同 `appKey` 区分数据来源。

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
