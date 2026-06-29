# Codex Monitor

一个生产级 MVP 前端监控系统，包含浏览器 SDK、Node/NestJS 服务端、Redis Worker、MySQL 存储和 React 控制台。

## 功能

- SDK 自动采集 JS 错误、Promise 错误、资源错误、Fetch/XHR、Web Vitals、PV、路由、点击和自定义事件。
- 默认脱敏 URL query、Cookie、Token、密码、表单等敏感信息。
- Server 提供登录、项目隔离、应用管理、上报入口、看板查询、告警规则和 sourcemap 上传。
- Worker 使用 BullMQ 异步消费事件，写入 MySQL，做分钟聚合、告警通知和 sourcemap 反解。
- Client 提供中文监控控制台，覆盖总览、错误、性能、行为、应用配置和告警中心。

## 本地启动

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

默认账号：

- 邮箱：`admin@example.com`
- 密码：`admin123456`

默认地址：

- Client: `http://localhost:5173`
- Server: `http://localhost:3000/api`
- 示例业务页：`pnpm --filter @codex-monitor/example-web dev` 后访问 `http://localhost:5174`

## Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

首次启动后进入 server 容器执行数据库迁移和 seed：

```bash
docker compose exec server pnpm prisma:migrate
docker compose exec server pnpm prisma:seed
```

## SDK 接入

```ts
import { initMonitor, setUser, track, captureException } from "@codex-monitor/sdk";

initMonitor({
  appKey: "your-app-key",
  endpoint: "https://monitor.example.com/api/collect",
  release: "1.0.0",
  environment: "production",
  maskFields: ["mobile"],
  beforeSend(event) {
    return event;
  }
});

setUser({ id: "u_1", name: "张三" });
track("checkout_click", { sku: "sku_1" });
captureException(new Error("manual error"));
```

## Sourcemap 上传

控制台的“应用配置”页面可以直接上传 `.map` 文件。也可以使用脚本：

```bash
node scripts/upload-sourcemap.mjs http://localhost:3000/api <jwtToken> <applicationId> 1.0.0 ./dist/app.js.map webpack://src
```

## Monorepo 结构

```text
apps/client   React 控制台
apps/server   NestJS API 服务
apps/worker   BullMQ 消费与聚合服务
packages/sdk  浏览器监控 SDK
examples/web  示例业务页面
```

## 验收路径

1. 启动 MySQL、Redis、Server、Worker、Client。
2. 登录控制台，创建项目与应用，或使用 seed 的 `demo-app-key`。
3. 启动 `examples/web`，点击按钮触发 PV、点击、自定义事件、错误和接口失败。
4. 在控制台查看总览、错误、性能和行为数据。
5. 创建告警规则，触发阈值后查看告警记录。
