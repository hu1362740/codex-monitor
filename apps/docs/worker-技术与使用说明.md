# Worker 子项目技术与使用说明

## 1. 项目定位

`apps/worker` 是 Codex Monitor 的异步数据处理服务。它不对外提供 HTTP API，而是作为后台进程持续监听 Redis/BullMQ 队列，消费 Server 投递的监控事件 batch。

一句话概括：

```text
Server 负责接收和入队，Worker 负责消费、清洗、入库、聚合、告警和 sourcemap 反解。
```

为什么需要 Worker：

- SDK 上报接口要尽快响应，不能在 HTTP 请求里做大量数据库写入和告警计算。
- 前端监控事件量可能很大，需要用队列削峰。
- 错误堆栈 sourcemap 反解、告警计算属于后台任务，更适合异步处理。
- Worker 可以水平扩容，多个 Worker 共同消费同一个队列。

## 2. 技术栈

- Node.js
- TypeScript
- BullMQ
- ioredis
- Prisma Client
- MySQL
- source-map
- nodemailer

## 3. 目录结构

```text
apps/worker
├─ package.json
├─ tsconfig.json
└─ src
   ├─ main.ts        # Worker 进程入口，连接 Redis，创建 BullMQ Worker
   ├─ processor.ts   # 核心事件处理逻辑，负责入库、分类、聚合、触发告警
   ├─ alerts.ts      # 告警规则计算和 Webhook/邮件通知
   ├─ sourcemap.ts   # 错误堆栈 sourcemap 反解
   └─ types.ts       # 队列 job 和事件 payload 类型
```

## 4. 入口在哪里

Worker 的源码入口是：

```text
apps/worker/src/main.ts
```

开发模式入口命令在 `apps/worker/package.json` 中：

```json
{
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start:prod": "node dist/main.js"
  }
}
```

也就是说：

- 开发环境执行 `tsx watch src/main.ts`。
- 生产环境先编译，再执行 `node dist/main.js`。

推荐从项目根目录启动，因为根脚本会加载根目录 `.env`：

```bash
pnpm dev
```

如果只想单独启动 Worker，推荐：

```bash
node scripts/run-with-env.mjs pnpm --filter @codex-monitor/worker dev
```

不推荐直接在根目录执行下面命令作为长期方案：

```bash
pnpm --filter @codex-monitor/worker dev
```

原因是 `apps/worker/src/main.ts` 使用 `dotenv/config`，单独 filter 执行时工作目录可能切到 `apps/worker`，它不一定能读取根目录 `.env`。使用 `scripts/run-with-env.mjs` 可以确保根目录 `.env` 被注入到子进程。

## 5. Worker 和 Server 的关系

Worker 不直接接收 SDK 请求。SDK 上报先到 Server：

```text
SDK
  ↓ POST /api/collect
Server IngestModule
  ↓ 校验 appKey / Origin / payload
BullMQ Queue: monitor-events
  ↓
Worker
```

Server 入队位置：

```text
apps/server/src/ingest/ingest.service.ts
```

Server 会把 `appKey` 解析成内部 `applicationId`，然后向 Redis 队列写入：

```ts
{
  applicationId: app.id,
  events: dto.events
}
```

因此 Worker 收到任务时已经知道应用 ID，不需要再通过 appKey 查询应用。

## 6. 队列配置

队列名称：

```text
monitor-events
```

Worker 创建位置：

```text
apps/worker/src/main.ts
```

核心代码结构：

```ts
const worker = new Worker<BatchJob>(
  "monitor-events",
  async (job) => {
    await processBatch(prisma, job.data);
  },
  { connection, concurrency: 5 }
);
```

含义：

- 监听 Redis 中名为 `monitor-events` 的 BullMQ 队列。
- 每个 job 的数据类型是 `BatchJob`。
- 每拿到一个 job，就调用 `processBatch(prisma, job.data)`。
- `concurrency: 5` 表示同一个 Worker 进程最多并发处理 5 个 job。

Redis 连接配置：

```ts
const connection = new IORedis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null
});
```

`maxRetriesPerRequest: null` 是 BullMQ 推荐配置，避免阻塞命令在 Redis 短暂异常时被 ioredis 提前中断。

## 7. BatchJob 数据结构

定义位置：

```text
apps/worker/src/types.ts
```

```ts
export interface BatchJob {
  applicationId: string;
  events: CollectedEvent[];
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `applicationId` | Server 根据 appKey 查出的应用主键 |
| `events` | SDK 批量上报的事件数组 |

单个事件类型：

```ts
export interface CollectedEvent {
  type: "error" | "performance" | "behavior" | "custom";
  name: string;
  appKey: string;
  sessionId: string;
  traceId: string;
  url: string;
  userAgent: string;
  viewport: string;
  timestamp: number;
  environment: string;
  release?: string;
  message?: string;
  stack?: string;
  source?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  target?: string;
  duration?: number;
  value?: number;
  status?: number;
  user?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

这个结构来源于 SDK，并经过 Server DTO 校验后进入队列。

## 8. 总体执行流程

```text
启动 Worker 进程
  ↓
读取环境变量 DATABASE_URL / REDIS_HOST / REDIS_PORT / SMTP_*
  ↓
创建 PrismaClient，连接 MySQL
  ↓
创建 ioredis 连接
  ↓
创建 BullMQ Worker，监听 monitor-events 队列
  ↓
收到 BatchJob
  ↓
调用 processBatch(prisma, job.data)
  ↓
遍历 job.events
  ↓
每个事件先写 events_raw
  ↓
按事件 type 写入明细表
  ↓
写入或更新 metric_aggregates
  ↓
整批事件处理完后 evaluateAlerts
  ↓
job completed 或 failed
```

## 9. 源码调用链

### 9.1 main.ts

职责：

- 加载环境变量。
- 创建 Prisma Client。
- 创建 Redis 连接。
- 创建 BullMQ Worker。
- 监听 completed / failed 事件。
- 处理 SIGTERM，优雅关闭。

关键入口：

```ts
await processBatch(prisma, job.data);
```

开发者读代码时可以从 `main.ts` 开始，然后跳到 `processor.ts`。

### 9.2 processor.ts

职责：

- Worker 的核心业务处理器。
- 把原始事件写入 `events_raw`。
- 根据事件类型写入对应明细表。
- 更新分钟级聚合表。
- 在 batch 完成后触发告警计算。

核心函数：

```ts
export async function processBatch(prisma: PrismaClient, job: BatchJob): Promise<void>
```

处理顺序：

1. 遍历 `job.events`。
2. 把每条事件完整写入 `events_raw`。
3. 如果 `event.type === "error"`，写入 `error_events`。
4. 如果 `event.type === "performance"`，写入 `performance_events`。
5. 如果 `event.type === "behavior"` 或 `custom`，写入 `behavior_events`。
6. 对每条事件执行 `metricAggregate.upsert`。
7. 整个 batch 处理完后执行 `evaluateAlerts`。

### 9.3 sourcemap.ts

职责：

- 根据错误事件的 `applicationId + release` 查找 sourcemap。
- 使用 `source-map` 包把 bundle 中的行列号映射回源码位置。
- 返回 `mappedStack`。

核心函数：

```ts
export async function mapStack(
  prisma: PrismaClient,
  input: { applicationId: string; release?: string; stack?: string }
): Promise<string | undefined>
```

匹配条件：

- 错误事件必须有 `stack`。
- 错误事件必须有 `release`。
- 数据库中必须有相同 `applicationId` 和 `release` 的 sourcemap 记录。

当前 MVP 匹配策略：

```text
applicationId + release -> 找最新上传的 sourcemap
```

它还没有精确到某个 bundle 文件名，因此一个 release 下建议先只上传与当前示例相关的 `.map` 文件。

### 9.4 alerts.ts

职责：

- 查询当前应用启用中的告警规则。
- 根据每条规则的时间窗口计算指标。
- 判断指标是否触发阈值。
- 触发后发送通知。
- 写入 `alert_records`。

支持指标：

- `error_count`
- `error_rate`
- `api_failure_rate`
- `lcp`

支持通知：

- Webhook
- SMTP 邮件

核心函数：

```ts
export async function evaluateAlerts(prisma: PrismaClient, applicationId: string): Promise<void>
```

### 9.5 types.ts

职责：

- 定义 Worker 消费的事件结构。
- 定义 BullMQ job payload。

这个文件需要和下面两个地方保持一致：

- SDK 事件类型：`packages/sdk/src/types.ts`
- Server 上报 DTO：`apps/server/src/ingest/ingest.dto.ts`

## 10. 事件入库细节

### 10.1 原始事件表 events_raw

每条事件都会先写入 `events_raw`。

目的：

- 保留完整原始 payload。
- 后续如果明细表结构变化，可以重新处理原始事件。
- 排查 SDK 上报内容时有据可查。

写入字段包括：

- `applicationId`
- `type`
- `name`
- `sessionId`
- `traceId`
- `userId`
- `url`
- `release`
- `environment`
- `payload`
- `occurredAt`

### 10.2 错误事件 error_events

条件：

```ts
event.type === "error"
```

写入内容：

- 错误名 `name`
- 错误消息 `message`
- 原始堆栈 `stack`
- 反解堆栈 `mappedStack`
- 来源 `source`
- 文件名 `filename`
- 行列号 `lineno` / `colno`
- 页面 URL
- release / environment
- sessionId / userId
- fingerprint

fingerprint 生成逻辑：

```ts
sha1(event.name + event.message + event.filename + event.lineno)
```

作用是把相同位置、相同类型的错误聚合到同一类。

### 10.3 性能事件 performance_events

条件：

```ts
event.type === "performance"
```

写入内容：

- Web Vitals 指标，如 LCP、CLS、INP、FCP、TTFB。
- HTTP 请求指标，如 `http_request`。
- `value`
- `duration`
- `status`
- URL
- metadata

### 10.4 行为事件 behavior_events

条件：

```ts
event.type === "behavior" || event.type === "custom"
```

写入内容：

- PV：`page_view`
- 点击：`click`
- 自定义事件：`track(...)`
- target
- metadata
- URL
- userId

当前 custom 事件也落在 `behavior_events` 表里，便于统一查询行为类事件。

## 11. 聚合逻辑

聚合表：

```text
metric_aggregates
```

当前聚合粒度：

```text
分钟
```

每条事件会生成一个 metric key：

```text
<eventType>:<eventName>
```

示例：

- `error:TypeError`
- `performance:LCP`
- `performance:http_request`
- `behavior:page_view`
- `custom:demo_click`

写入方式是 upsert：

- 如果该分钟、该应用、该 metric 不存在，则创建 value = 1。
- 如果已存在，则 value + 1。

唯一键：

```text
applicationId + bucket + metric
```

## 12. 告警流程

告警入口：

```text
processor.ts -> evaluateAlerts(prisma, applicationId)
```

触发时机：

```text
每个 batch 全部事件入库后执行一次
```

流程：

```text
查询启用的 alert_rules
  ↓
按 durationMin 计算时间窗口
  ↓
查询错误数、PV、接口事件、LCP 事件
  ↓
计算规则对应指标
  ↓
compare(operator, value, threshold)
  ↓
命中阈值则 notify
  ↓
写 alert_records
```

通知说明：

- Webhook：向 `rule.target` 发送 POST JSON。
- Email：读取 `SMTP_HOST` 等环境变量发送邮件。
- 如果邮件配置缺失，不会影响事件处理，只会把 `notified` 记录为 `false`。

## 13. Sourcemap 反解流程

触发位置：

```text
processor.ts 处理 error 事件时
```

流程：

```text
error event
  ↓
读取 event.release 和 event.stack
  ↓
用 applicationId + release 查询 sourcemap_artifacts
  ↓
读取 artifact.filePath 对应的 .map 文件
  ↓
SourceMapConsumer 解析 map
  ↓
逐行匹配 stack 中的 file:line:column
  ↓
originalPositionFor({ line, column })
  ↓
生成 mappedStack
  ↓
写入 error_events.mappedStack
```

反解失败不会导致 job 失败的常见情况：

- 没有 `release`。
- 没有 `stack`。
- 没有找到 sourcemap。
- 某一行 stack 没有 `line:column`。

当前代码中，如果找到了 sourcemap 文件但文件不存在或内容损坏，`readFile` 或 `SourceMapConsumer` 会抛错，job 会失败并按 BullMQ 重试策略处理。

## 14. 本地运行

推荐完整启动：

```bash
pnpm dev
```

只启动 Worker：

```bash
node scripts/run-with-env.mjs pnpm --filter @codex-monitor/worker dev
```

运行前确认：

- MySQL 已启动。
- Redis 已启动。
- 已执行 `pnpm db:migrate`。
- 已执行 `pnpm db:generate`。
- Server 正在运行并能向 Redis 写入队列。

## 15. 构建与生产运行

构建：

```bash
pnpm --filter @codex-monitor/worker build
```

生产运行：

```bash
pnpm --filter @codex-monitor/worker start:prod
```

生产环境推荐由 Docker、PM2、systemd 或容器平台托管 Worker 进程。

## 16. 环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | MySQL 连接 |
| `REDIS_HOST` | Redis 地址 |
| `REDIS_PORT` | Redis 端口 |
| `SMTP_HOST` | 邮件服务器 |
| `SMTP_PORT` | 邮件服务器端口 |
| `SMTP_USER` | 邮件账号 |
| `SMTP_PASS` | 邮件密码 |
| `SMTP_FROM` | 邮件发送人 |

## 17. 开发者调试指南

### 17.1 判断 Worker 是否启动

启动后看到类似日志：

```text
processed monitor batch <jobId>
```

说明 Worker 已成功消费任务。

### 17.2 队列有任务但不入库

检查：

- Worker 是否运行。
- Redis 地址是否和 Server 一致。
- `DATABASE_URL` 是否正确。
- Prisma Client 是否已生成。

### 17.3 如何确认事件是否被处理

可以按顺序查：

1. `events_raw` 是否有数据。
2. 对应类型表是否有数据：
   - `error_events`
   - `performance_events`
   - `behavior_events`
3. `metric_aggregates` 是否有分钟聚合。
4. 如果有告警规则，`alert_records` 是否有记录。

### 17.4 mappedStack 为空

检查：

- SDK 是否配置了 `release`。
- sourcemap 上传时填写的 release 是否一致。
- sourcemap 文件是否仍在 `uploads/sourcemaps/...` 路径。
- 错误 stack 是否包含 `文件:行:列`。
- Worker 是否是在 sourcemap 上传后处理的新错误。

## 18. 扩容建议

- Worker 可以水平扩容。
- 多个 Worker 连接同一个 Redis 队列即可。
- 上报量增加时优先观察 Redis 队列堆积和 MySQL 写入耗时。
- MySQL 写入成为瓶颈后，可以把明细事件迁移到 ClickHouse，MySQL 只保留配置、项目、告警等元数据。
- 告警计算当前是 batch 后同步执行，规则变多后可拆成独立告警 Worker。

## 19. 常见问题

### Worker 会不会重复处理事件

BullMQ 在异常重试时可能再次执行同一个 job。当前 MVP 没有对事件做强幂等去重，因此极端情况下可能重复写入。后续可以用 `traceId` 或 SDK 事件 ID 做幂等约束。

### Worker 挂了会丢数据吗

只要 Server 已成功把 job 写入 Redis，Worker 短暂挂掉不会立即丢失数据。Worker 恢复后会继续消费队列中的 job。Redis 本身仍需要配置持久化和可靠部署。

### 为什么 custom 事件写入 behavior_events

当前 MVP 把用户行为和业务自定义事件统一放在行为表中，方便控制台统一查询。后续如果自定义事件量很大，可以单独拆 `custom_events`。

### 为什么 sourcemap 匹配不按文件名

当前版本为了先跑通链路，只按 `applicationId + release` 找最新 sourcemap。生产增强版建议增加 bundle 文件名或 sourceMappingURL 关联，做到精确匹配。

