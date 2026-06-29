# Server 子项目技术与使用说明

## 1. 项目定位

`apps/server` 是 Codex Monitor 的 API 服务，负责管理端接口和 SDK 上报入口。它不直接执行重型数据处理，而是将上报事件投递到 Redis 队列，由 Worker 异步消费。

## 2. 技术栈

- NestJS
- Prisma
- MySQL
- Redis
- BullMQ
- JWT
- class-validator / class-transformer
- Multer

## 3. 目录结构

```text
apps/server
├─ prisma
│  ├─ schema.prisma
│  ├─ seed.ts
│  └─ migrations
├─ src
│  ├─ main.ts
│  ├─ app.module.ts
│  ├─ auth
│  ├─ projects
│  ├─ ingest
│  ├─ events
│  ├─ dashboard
│  ├─ alerts
│  ├─ sourcemaps
│  ├─ prisma
│  └─ common
├─ package.json
├─ nest-cli.json
└─ tsconfig.json
```

## 4. 模块说明

### Auth

路径：`src/auth`

接口：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

职责：

- 注册用户。
- 登录校验。
- 生成 JWT。
- 返回当前用户信息。

### Projects

路径：`src/projects`

接口：

- `GET /api/projects`
- `POST /api/projects`
- `POST /api/apps`

职责：

- 管理用户项目。
- 创建业务应用。
- 生成 `appKey`。
- 保存应用允许域名。

### Ingest

路径：`src/ingest`

接口：

- `POST /api/collect`

职责：

- 接收 SDK 上报。
- 校验事件数量。
- 校验 envelope appKey 与事件 appKey。
- 校验 appKey 是否存在。
- 校验 Origin 是否在应用允许域名内。
- 将事件 batch 投递到 BullMQ 队列。

### Events

路径：`src/events`

接口：

- `GET /api/events/errors`
- `GET /api/events/performance`
- `GET /api/events/behavior`

职责：

- 查询错误、性能、行为明细。
- 校验当前用户是否拥有 applicationId。

### Dashboard

路径：`src/dashboard`

接口：

- `GET /api/dashboard/overview`

职责：

- 查询今日 PV、UV、错误数、错误率、接口失败率。
- 计算 Web Vitals 平均值。
- 查询 Top 错误。

### Alerts

路径：`src/alerts`

接口：

- `GET /api/alerts/rules`
- `POST /api/alerts/rules`
- `PUT /api/alerts/rules/:id`
- `DELETE /api/alerts/rules/:id`

职责：

- 告警规则 CRUD。
- 查看最近触发记录。

### Sourcemaps

路径：`src/sourcemaps`

接口：

- `POST /api/sourcemaps/upload`

职责：

- 上传 `.map` 文件。
- 保存文件到 `uploads/sourcemaps/<applicationId>/<release>`。
- 写入 `sourcemap_artifacts`。

## 5. 鉴权和隔离

- 管理端接口使用 `JwtAuthGuard`。
- 用户只能访问自己拥有项目下的应用。
- SDK 上报不使用 JWT，但必须提供有效 `appKey`。
- SDK 上报的 Origin 必须命中应用允许域名。

## 6. 数据库

Prisma schema 位于：

```text
apps/server/prisma/schema.prisma
```

常用命令：

```bash
pnpm --filter @codex-monitor/server prisma:generate
pnpm --filter @codex-monitor/server prisma:migrate
pnpm --filter @codex-monitor/server prisma:seed
```

## 7. 本地运行

```bash
pnpm --filter @codex-monitor/server dev
```

默认监听：

```text
http://localhost:3000/api
```

## 8. 构建与生产运行

```bash
pnpm --filter @codex-monitor/server build
pnpm --filter @codex-monitor/server start:prod
```

## 9. 环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | MySQL 连接 |
| `REDIS_HOST` | Redis 地址 |
| `REDIS_PORT` | Redis 端口 |
| `JWT_SECRET` | JWT 密钥 |
| `SERVER_PORT` | Server 端口 |

## 10. 维护建议

- 生产环境必须替换 `JWT_SECRET`。
- 给 `/api/collect` 配置独立限流策略。
- 上报接口尽量保持轻逻辑，只做校验和入队。
- 查询接口应优先查询聚合表，明细表用于下钻。
- sourcemap 文件目录需要持久化和备份。

