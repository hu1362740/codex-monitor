# Worker 子项目技术与使用说明

## 1. 项目定位

`apps/worker` 是 Codex Monitor 的异步数据处理服务。它消费 Server 投递到 Redis/BullMQ 的事件 batch，将原始数据清洗成不同明细表，并执行聚合、告警和 sourcemap 反解。

## 2. 技术栈

- Node.js
- TypeScript
- BullMQ
- ioredis
- Prisma Client
- source-map
- nodemailer

## 3. 目录结构

```text
apps/worker
├─ package.json
├─ tsconfig.json
└─ src
   ├─ main.ts
   ├─ processor.ts
   ├─ alerts.ts
   ├─ sourcemap.ts
   └─ types.ts
```

## 4. 消费队列

队列名称：

```text
monitor-events
```

Server 在 `/api/collect` 中将 batch 写入该队列。

Worker 配置：

- concurrency：`5`
- job 类型：`batch`
- 失败任务由 BullMQ 按 Server 入队配置重试。

## 5. 数据处理流程

```text
接收 BatchJob
  ↓
遍历 events
  ↓
写入 events_raw
  ↓
按 type 写入 error_events / performance_events / behavior_events
  ↓
写入 metric_aggregates
  ↓
执行告警规则
```

## 6. 事件分类

### error

写入：

- `events_raw`
- `error_events`

处理内容：

- 计算 fingerprint。
- 保存 message、stack、source、filename、line、column。
- 如果存在 sourcemap，则生成 mappedStack。

### performance

写入：

- `events_raw`
- `performance_events`

处理内容：

- 保存 Web Vitals 数值。
- 保存接口耗时、状态码和 metadata。

### behavior / custom

写入：

- `events_raw`
- `behavior_events`

处理内容：

- 保存 PV、点击、自定义事件。
- 保存 target、metadata、userId。

## 7. 聚合逻辑

当前聚合粒度为分钟。

metric 命名规则：

```text
<eventType>:<eventName>
```

示例：

- `error:TypeError`
- `performance:LCP`
- `performance:http_request`
- `behavior:page_view`

聚合表唯一键：

```text
applicationId + bucket + metric
```

## 8. 告警逻辑

文件：`src/alerts.ts`

支持指标：

- `error_count`
- `error_rate`
- `api_failure_rate`
- `lcp`

支持渠道：

- Webhook：发送 JSON POST 请求。
- Email：使用 SMTP 发送邮件。

告警执行时机：

- 每个 batch 处理完成后，对当前 applicationId 执行规则计算。

## 9. Sourcemap 反解

文件：`src/sourcemap.ts`

反解条件：

- 错误事件存在 `stack`。
- 错误事件存在 `release`。
- 数据库存在同 applicationId、同 release 的 sourcemap 记录。
- stack 行中能匹配到 `file:line:column`。

反解结果写入：

```text
error_events.mappedStack
```

## 10. 本地运行

```bash
pnpm --filter @codex-monitor/worker dev
```

运行前确认：

- MySQL 已启动。
- Redis 已启动。
- 已执行 Prisma migration。
- Server 正在向 Redis 写入队列。

## 11. 构建与生产运行

```bash
pnpm --filter @codex-monitor/worker build
pnpm --filter @codex-monitor/worker start:prod
```

## 12. 环境变量

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

## 13. 扩容建议

- Worker 可以水平扩容。
- 多个 Worker 使用同一个 Redis 队列即可。
- 上报量变大后优先关注 MySQL 写入能力。
- 大规模场景建议将明细事件迁移到 ClickHouse。

## 14. 故障排查

### 队列有数据但没有入库

检查：

- Worker 是否启动。
- Redis 连接是否正确。
- `DATABASE_URL` 是否正确。
- Prisma Client 是否生成。

### 告警没有通知

检查：

- 规则是否 enabled。
- 指标是否超过阈值。
- Webhook 地址是否可访问。
- SMTP 配置是否完整。

### mappedStack 为空

检查：

- release 是否匹配。
- sourcemap 文件是否存在。
- stack 是否包含 line 和 column。

