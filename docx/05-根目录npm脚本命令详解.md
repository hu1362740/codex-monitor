# 根目录 npm 脚本命令详解

## 1. 文档目的

本文详细解释项目根目录 `package.json` 中的 npm scripts，包括命令名称、完整文本、pnpm 参数、实际触发的子项目脚本、执行流程和使用注意事项。

项目使用 pnpm workspace 管理以下工作区包：

| 包名 | 目录 | 职责 |
| --- | --- | --- |
| `@codex-monitor/client` | `apps/client` | React 管理控制台 |
| `@codex-monitor/server` | `apps/server` | NestJS API 服务 |
| `@codex-monitor/worker` | `apps/worker` | BullMQ 异步任务处理 |
| `@codex-monitor/sdk` | `packages/sdk` | 浏览器监控 SDK |
| `@codex-monitor/example-web` | `examples/web` | SDK 接入示例页面 |

根目录声明的包管理器版本为：

```json
"packageManager": "pnpm@9.15.0"
```

推荐通过以下形式执行本文脚本：

```bash
pnpm dev
pnpm build
pnpm test
```

使用 `npm run dev` 也能进入根脚本，但脚本内部仍然调用 pnpm，因此运行环境必须安装或启用 pnpm。

## 2. pnpm 公共参数说明

### `-r` / `--recursive`

递归选择 pnpm workspace 中的子包，并在每个包含目标 script 的子包内执行该 script。

当前默认不会再次执行 workspace 根包自身的同名 script，因此不会产生 `build → pnpm -r build → build` 的无限递归。没有声明目标 script 的子包通常会被跳过。

### `--parallel`

让所有被选中的包立即并行执行目标 script，不按照 workspace 依赖拓扑排序，也不受常规 workspace 并发限制约束。

它特别适合 `dev`、`watch`、本地服务器等不会主动退出的长期进程。输出会来自多个包并交错显示。

### `--filter <package>`

把命令执行范围限制到符合筛选条件的 workspace 包。本文数据库命令使用准确包名 `@codex-monitor/server`，因此只会进入 `apps/server` 执行。

## 3. `dev`：启动全部开发进程

### 命令名称

```text
dev
```

### 完整命令文本

```bash
node scripts/run-with-env.mjs pnpm -r --parallel dev
```

### 参数解释

| 片段 | 含义 |
| --- | --- |
| `pnpm` | 调用 pnpm CLI |
| `node scripts/run-with-env.mjs` | 先加载根目录 `.env`，再执行后续命令 |
| `-r` | 递归处理 workspace 子包 |
| `--parallel` | 所有子包的 dev 脚本立即并行运行 |
| `dev` | 要在各子包中执行的 script 名称 |

### 功能描述

一次启动整个 monorepo 的开发模式，包括前端控制台、API 服务、Worker、SDK watch 构建和示例业务页面。

### 实际执行内容

| 子项目 | 实际命令 | 作用 |
| --- | --- | --- |
| Client | `vite --host 0.0.0.0` | 启动 Vite 开发服务器，默认端口 5173 |
| Server | `nest start --watch` | 启动 NestJS 服务并监听源码变化 |
| Worker | `tsx watch src/main.ts` | 运行 Worker 并监听 TypeScript 文件变化 |
| SDK | `tsup --watch` | 监听 SDK 源码并持续重新打包 |
| Example Web | `vite --host 0.0.0.0 --port 5174` | 启动示例业务页 |

### 执行流程

1. pnpm 读取 `pnpm-workspace.yaml`。
2. 找出所有声明 `dev` script 的 workspace 包。
3. 忽略包依赖先后关系，立即启动五个 dev 进程。
4. 各进程持续监听文件变化，不会自行结束。
5. 用户按 `Ctrl+C` 后，根命令结束并通知子进程退出。

### 注意事项

- 该命令不会自动启动 MySQL 和 Redis，应提前运行 `docker compose up mysql redis` 或准备外部实例。
- Server 启动时会连接 MySQL；Worker 启动时需要 MySQL、Redis 和已生成的 Prisma Client。
- 应先准备 `.env`，尤其是 `DATABASE_URL`、`REDIS_HOST`、`REDIS_PORT`、`JWT_SECRET`。
- 多个子项目日志会交错显示，这是并行模式的正常现象。
- SDK 的 dev 任务是 watch 构建，不是 HTTP 服务。
- 如果任一端口已被占用，对应 Vite/Nest 进程可能启动失败。

## 4. `build`：构建全部工作区包

### 命令名称

```text
build
```

### 完整命令文本

```bash
pnpm -r build
```

### 参数解释

| 片段 | 含义 |
| --- | --- |
| `pnpm` | 调用 pnpm CLI |
| `-r` | 在 workspace 子包中递归执行 |
| `build` | 执行每个子包的 build script |

### 功能描述

构建全部可发布或可运行产物。与 `dev` 不同，该命令没有 `--parallel`，pnpm 会按照 workspace 依赖关系组织任务；例如示例应用依赖 SDK，SDK 会作为其 workspace 依赖参与拓扑排序。

### 实际执行内容

| 子项目 | 实际命令 | 主要产物 |
| --- | --- | --- |
| Client | `tsc -b && vite build` | 类型检查后生成 `apps/client/dist` |
| Server | `nest build` | 编译为 `apps/server/dist` |
| Worker | `tsc -p tsconfig.json` | 编译为 `apps/worker/dist` |
| SDK | `tsup && node scripts/size-report.mjs` | 生成 ESM、CJS、IIFE、类型声明和体积报告 |
| Example Web | `vite build` | 生成 `examples/web/dist` |

### 执行流程

1. pnpm 搜索拥有 `build` script 的所有 workspace 包。
2. 根据 workspace 依赖关系安排构建。
3. 执行 TypeScript、Nest、Vite 和 tsup 构建。
4. SDK 构建成功后运行体积统计脚本，输出原始大小和 gzip 大小。
5. 任一包构建失败时，根 `build` 返回非零退出码。

### 注意事项

- 此命令只构建代码，不执行数据库 migration，不启动服务，也不构建 Docker 镜像。
- 构建前应先执行 `pnpm install` 和 `pnpm db:generate`。
- Client 使用 `&&`，因此只有 `tsc -b` 成功后才会执行 `vite build`。
- SDK 输出文件由 `packages/sdk/tsup.config.ts` 决定。
- CI 应把该命令作为发布前必检项。

## 5. `test`：运行全部子项目测试

### 命令名称

```text
test
```

### 完整命令文本

```bash
pnpm -r test
```

### 参数解释

| 片段 | 含义 |
| --- | --- |
| `-r` | 遍历 workspace 子包 |
| `test` | 执行各子包的 test script |

### 功能描述

使用 Vitest 的非 watch 模式运行各子项目测试，适合本地完整验证和 CI。

### 实际执行内容

| 子项目 | 实际命令 | 当前状态 |
| --- | --- | --- |
| Client | `vitest run` | 已配置命令，当前未发现测试文件 |
| Server | `vitest run` | 已配置命令，当前未发现测试文件 |
| Worker | `vitest run` | 已配置命令，当前未发现测试文件 |
| SDK | `vitest run` | 执行 `test/privacy.test.ts` |
| Example Web | 无 | 未声明 test，会被跳过 |

### 执行流程

1. pnpm 找出声明 `test` 的四个子包。
2. 各包调用 Vitest 的 `run` 模式。
3. Vitest 扫描测试文件并执行一次后退出。
4. 任一测试失败或进程返回非零退出码，根命令失败。

### 注意事项

- `vitest run` 不是监听模式，适合自动化环境。
- 当前 Client、Server、Worker 没有测试文件；Vitest 默认可能以“未找到测试文件”返回非零退出码，因此根 `test` 当前可能失败。
- 如需暂时允许无测试文件，可在对应命令增加 `--passWithNoTests`；更推荐补充真实测试。
- 数据库集成测试应使用独立测试库，避免污染开发数据。

## 6. `lint`：执行 TypeScript 静态类型检查

### 命令名称

```text
lint
```

### 完整命令文本

```bash
pnpm -r lint
```

### 参数解释

| 片段 | 含义 |
| --- | --- |
| `-r` | 在所有 workspace 包中递归执行 |
| `lint` | 执行各子包的 lint script |

### 功能描述

当前项目的 `lint` 实际是 TypeScript 类型检查，不是 ESLint 规则检查。它用于发现类型错误、错误导入、接口不匹配等问题，并且不输出 JavaScript 文件。

### 实际执行内容

| 子项目 | 实际命令 |
| --- | --- |
| Client | `tsc --noEmit` |
| Server | `tsc --noEmit` |
| Worker | `tsc --noEmit` |
| SDK | `tsc --noEmit` |
| Example Web | `tsc --noEmit` |

### 执行流程

1. pnpm 找出全部声明 `lint` 的子包。
2. 每个包运行 TypeScript 编译器。
3. `--noEmit` 让 TypeScript 只检查，不生成 `dist` 或 `.js` 文件。
4. 任何类型错误都会使对应子包和根命令失败。

### 注意事项

- 该命令不会检查代码风格、未使用变量规则或 React Hooks 规则，除非 TypeScript 配置本身包含相应检查。
- Server 的 `tsconfig.json` 只包含 `src/**/*.ts`，不会检查 `prisma/seed.ts`。
- 当前 `examples/web` 没有独立 `tsconfig.json`，其 `tsc --noEmit` 可能因找不到项目配置而无法按预期工作。
- 如果需要真正的 lint，建议后续加入 ESLint，并把类型检查拆成 `typecheck` script。

## 7. `format`：格式化项目源码和文档

### 命令名称

```text
format
```

### 完整命令文本

```bash
prettier --write "**/*.{ts,tsx,js,json,md,css,prisma}"
```

### 参数解释

| 片段 | 含义 |
| --- | --- |
| `prettier` | 调用根目录 devDependency 中的 Prettier |
| `--write` | 直接把格式化结果写回文件，而不只是检查 |
| `"**/*..."` | 递归匹配指定扩展名文件；引号避免 shell 提前展开 glob |
| `{ts,tsx,js,json,md,css,prisma}` | 要处理的文件类型集合 |

### 功能描述

统一格式化 TypeScript、TSX、JavaScript、JSON、Markdown、CSS 和 Prisma 文件。

### 执行流程

1. shell 将带引号的 glob 原样传给 Prettier。
2. Prettier 从根目录递归查找匹配文件。
3. Prettier 根据文件类型选择 parser。
4. 格式化结果直接覆盖原文件。
5. 无法解析的文件会报告错误，并可能让命令返回非零退出码。

### 注意事项

- 该命令会修改文件，执行前应确认工作区改动并在执行后查看 diff。
- 匹配范围不包含 `.mjs`、`.html`、`.yaml`、`.yml`，因此上传脚本、HTML 和 pnpm workspace 配置不会被处理。
- 项目当前没有声明 Prisma 的 Prettier 插件。Prettier 默认通常无法解析 `.prisma`，因此命中 `schema.prisma` 时可能报“无法推断 parser”。Prisma schema 更适合使用 `prisma format`，或安装对应 Prettier 插件。
- `node_modules` 默认被 Prettier 忽略，`.gitignore` 中的 `dist` 等目录也应保持忽略。
- CI 中如只想检查而不改文件，应使用 `prettier --check`。

## 8. `db:generate`：生成 Prisma Client

### 命令名称

```text
db:generate
```

### 完整命令文本

```bash
node scripts/run-with-env.mjs pnpm --filter @codex-monitor/server prisma:generate
```

### 参数解释

| 片段 | 含义 |
| --- | --- |
| `--filter @codex-monitor/server` | 只选择 Server workspace 包 |
| `prisma:generate` | 执行 Server 中同名 script |
| `run-with-env.mjs` | 将根目录 `.env` 注入 Server 子进程 |

Server 中展开后的实际命令：

```bash
prisma generate --schema prisma/schema.prisma
```

| 子参数 | 含义 |
| --- | --- |
| `prisma generate` | 根据 Prisma schema 生成客户端代码 |
| `--schema prisma/schema.prisma` | 显式指定 schema 文件位置 |

### 功能描述

读取 `apps/server/prisma/schema.prisma`，生成与当前数据模型匹配的 `@prisma/client` 代码和 TypeScript 类型，供 Server 与 Worker 调用数据库。

### 执行流程

1. pnpm 只选择 `@codex-monitor/server`。
2. 工作目录切换到 `apps/server`。
3. Prisma 解析 schema、generator、datasource 和模型。
4. 生成 Prisma Client。
5. 后续 TypeScript 编译可以获得模型、枚举和查询参数类型。

### 注意事项

- 安装依赖后应至少执行一次。
- 修改 `schema.prisma` 后必须重新生成。
- 该命令本身不创建数据库表，也不应用 migration。
- 虽然通常不连接数据库，但 schema 解析可能需要有效的 `DATABASE_URL` 环境变量。
- Worker 同样导入 `@prisma/client`，因此 Worker 构建和运行也依赖生成结果。

## 9. `db:migrate`：创建并应用开发数据库迁移

### 命令名称

```text
db:migrate
```

### 完整命令文本

```bash
node scripts/run-with-env.mjs pnpm --filter @codex-monitor/server prisma:migrate
```

### 参数解释

| 片段 | 含义 |
| --- | --- |
| `--filter @codex-monitor/server` | 只在 Server 子项目执行 |
| `prisma:migrate` | 调用 Server 的 Prisma migration script |
| `run-with-env.mjs` | 在 pnpm 切换子项目目录前加载根 `.env` |

Server 中展开后的实际命令：

```bash
prisma migrate dev --schema prisma/schema.prisma
```

| 子参数 | 含义 |
| --- | --- |
| `migrate dev` | 面向开发环境创建并应用 migration |
| `--schema` | 指定 Prisma schema 路径 |

### 功能描述

把 Prisma schema 与开发数据库进行比较，创建需要的新 migration，并应用尚未执行的 migration。成功后通常还会触发 Prisma Client 生成。

### 执行流程

1. 读取 `.env` 中的 `DATABASE_URL`。
2. 连接 MySQL 开发数据库。
3. 检查 migration 历史和数据库 schema drift。
4. 根据 schema 差异生成 migration，必要时提示输入 migration 名称。
5. 按顺序执行未应用 migration。
6. 更新 Prisma migration 元数据并生成 Client。

### 注意事项

- 这是开发命令，可能需要交互输入，不适合生产环境自动发布。
- 生产环境应使用 `prisma migrate deploy` 应用已提交的 migration。
- 命令会真实修改数据库结构，执行前必须确认 `DATABASE_URL` 指向正确环境。
- MySQL 用户需要建表、改表和索引等权限。
- Prisma 检测到 drift 时可能提示 reset。reset 会清空数据，不能在重要数据库上随意确认。
- 当前仓库已有初始 migration：`apps/server/prisma/migrations/20260629000000_init`。

## 10. `db:seed`：写入初始演示数据

### 命令名称

```text
db:seed
```

### 完整命令文本

```bash
node scripts/run-with-env.mjs pnpm --filter @codex-monitor/server prisma:seed
```

### 参数解释

| 片段 | 含义 |
| --- | --- |
| `--filter @codex-monitor/server` | 只进入 Server 子项目 |
| `prisma:seed` | 执行 Server 中的 seed script |
| `run-with-env.mjs` | 将根目录环境变量传给 seed 进程 |

Server 中展开后的实际命令：

```bash
tsx prisma/seed.ts
```

| 子参数 | 含义 |
| --- | --- |
| `tsx` | 直接运行 TypeScript 文件，无需先编译为 JavaScript |
| `prisma/seed.ts` | 数据初始化脚本 |

### 功能描述

向数据库写入本地体验所需的默认用户、项目和应用。该命令是直接执行自定义 TypeScript 脚本，并不是调用 `prisma db seed`。

### 实际写入内容

| 数据 | 默认值 |
| --- | --- |
| 用户邮箱 | `admin@example.com` |
| 用户密码 | `admin123456`，入库前使用 bcrypt 哈希 |
| 用户名称 | `管理员` |
| 项目 ID | `seed-project` |
| 项目名称 | `示例项目` |
| 应用名称 | `示例应用` |
| 应用 appKey | `demo-app-key` |
| 允许域名 | `localhost`、`127.0.0.1` |

### 执行流程

1. tsx 加载并执行 `prisma/seed.ts`。
2. 创建 Prisma Client 并连接 `DATABASE_URL` 指定的数据库。
3. 对默认用户执行 upsert，并生成 bcrypt 密码哈希。
4. 对示例项目执行 upsert。
5. 对示例应用执行 upsert。
6. 断开数据库连接；发生错误时输出错误并以状态码 1 退出。

### 注意事项

- 执行前必须完成 `db:generate` 和 `db:migrate`。
- 该脚本主要使用 upsert，重复执行通常不会重复创建默认记录。
- 默认账号仅用于本地演示，生产环境不得保留默认密码。
- seed 会真实写入 `DATABASE_URL` 对应数据库，执行前必须确认环境。
- 当前脚本不会为示例应用额外创建 `api_keys` 表记录，但 SDK 上报校验使用的是 `applications.appKey`，示例上报仍可工作。

## 11. 推荐执行顺序

### 首次本地初始化

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

### 日常开发

```bash
pnpm dev
pnpm lint
pnpm test
```

### 发布前检查

```bash
pnpm lint
pnpm test
pnpm build
```

### Prisma schema 变更后

```bash
pnpm db:migrate
pnpm db:generate
pnpm build
```

## 12. 命令影响范围汇总

| 命令 | 修改源码 | 生成构建文件 | 修改数据库 | 长期运行 |
| --- | --- | --- | --- | --- |
| `dev` | 否 | SDK watch 可能更新 dist | 否 | 是 |
| `build` | 否 | 是 | 否 | 否 |
| `test` | 否 | 可能生成缓存/覆盖率 | 取决于测试实现 | 否 |
| `lint` | 否 | 否 | 否 | 否 |
| `format` | 是 | 否 | 否 | 否 |
| `db:generate` | 否 | 生成 Prisma Client | 否 | 否 |
| `db:migrate` | 可能新增 migration | 生成 Prisma Client | 是 | 否 |
| `db:seed` | 否 | 否 | 是 | 否 |
