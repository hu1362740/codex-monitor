# Docker 使用与 Codex Monitor 部署指南

## 1. 文档目的

本文面向不熟悉 Docker 的开发者，解释 Docker 是什么、适合哪些场景、什么时候不建议使用 Docker，并结合 Codex Monitor 项目说明本地开发、测试环境、生产环境如何启动和部署。

本文重点回答三个问题：

1. Docker 是什么，什么时候适合使用，什么时候不适合使用。
2. 本项目本地开发环境是否可以用 Docker 启动，是否推荐。
3. 本项目测试环境和生产环境如何用 Docker 部署，具体步骤是什么。

## 2. 先给结论

### 2.1 Docker 是否值得学

值得。Docker 的核心价值是把“应用运行环境”打包起来，让项目在不同机器上更容易以相同方式运行。

如果没有 Docker，不同开发者机器上的 Node.js、MySQL、Redis、系统依赖、端口、环境变量可能都不一样，容易出现“我这里能跑，你那里跑不起来”的问题。

有了 Docker 后，可以把应用和依赖放进容器中运行，降低环境差异带来的问题。

### 2.2 Docker 是否任何时候都应该使用

不是。Docker 很适合服务端应用、数据库、缓存、中间件、测试环境和生产部署，但不是任何场景都必须使用。

如果只是日常写前端页面、频繁改代码、需要热更新和 IDE 调试，应用进程直接在本机运行通常更舒服。此时可以只用 Docker 启动 MySQL、Redis 等基础服务。

### 2.3 本项目本地开发是否推荐 Docker

本项目可以用 Docker 启动。

但日常开发更推荐“混合模式”：

- MySQL、Redis 用 Docker 启动。
- Server、Worker、Client 在本机用 `pnpm dev` 启动。

原因是本项目当前 `docker-compose.yml` 没有把源代码挂载进容器，代码修改后容器内不会自动同步，通常需要重新构建镜像。因此完整 Docker 启动更适合首次体验、演示、验收和模拟部署，不太适合作为日常开发主流程。

### 2.4 本项目测试和生产是否推荐 Docker

测试环境推荐使用 Docker Compose，能快速拉起 MySQL、Redis、Server、Worker、Client，环境一致性好。

生产环境可以使用 Docker，但建议更谨慎：

- Server、Worker 适合容器化部署。
- MySQL、Redis 生产环境建议使用托管服务、独立服务器或高可用集群。
- Client 当前 Dockerfile 使用 Vite dev server，不是理想的生产形态。生产更推荐构建静态文件后用 Nginx、CDN 或对象存储托管。
- sourcemap 上传文件必须做持久化，并让 Server 和 Worker 都能读到同一份文件。

## 3. Docker 基础概念

### 3.1 Docker 是什么

Docker 是一个容器化工具。它可以把应用程序及其运行依赖打包成镜像，然后在容器中运行。

可以把它理解为：

- 镜像：应用的运行包，类似“安装包 + 运行环境说明”。
- 容器：镜像运行起来后的进程环境，类似“一个隔离的小运行空间”。
- Dockerfile：描述如何构建镜像的文件。
- Docker Compose：用一个 YAML 文件同时管理多个容器。
- Volume：数据卷，用于持久化数据库、上传文件等数据。
- Network：容器网络，让容器之间可以通过服务名互相访问。

### 3.2 镜像和容器的区别

镜像是静态的，容器是运行中的。

例如本项目中的 `docker/server.Dockerfile` 用来构建 Server 镜像。镜像构建完成后，Docker 可以基于这个镜像启动一个 `server` 容器。容器停止后，镜像仍然存在，下次还可以继续用它启动新的容器。

### 3.3 Dockerfile 是什么

Dockerfile 是镜像构建说明书。

以本项目 Server 为例，`docker/server.Dockerfile` 做了这些事情：

1. 使用 `node:22-alpine` 作为基础镜像。
2. 设置工作目录 `/app`。
3. 开启 corepack，使用 pnpm。
4. 复制项目依赖描述文件。
5. 安装 Server 所需依赖。
6. 复制 `apps/server` 源码。
7. 生成 Prisma Client 并构建 NestJS 应用。
8. 暴露 3000 端口。
9. 使用 `pnpm start:prod` 启动服务。

### 3.4 Docker Compose 是什么

一个完整系统通常不止一个进程。本项目至少需要：

- MySQL
- Redis
- Server
- Worker
- Client

如果一个个手动启动容器，会比较麻烦。Docker Compose 就是用 `docker-compose.yml` 描述这些服务，然后用一条命令启动它们。

本项目根目录已经提供 `docker-compose.yml`。

### 3.5 Volume 是什么

容器默认是临时运行环境。容器删除后，容器内部写入的数据也可能丢失。

Volume 用来把重要数据保存到宿主机或 Docker 管理的数据卷中。

本项目已经给 MySQL 配置了数据卷：

```yaml
volumes:
  - mysql_data:/var/lib/mysql
```

这表示 MySQL 数据不会因为 MySQL 容器重建就直接丢失。

但是要特别注意：本项目 sourcemap 上传文件目前没有在 `docker-compose.yml` 中配置共享数据卷。Server 上传文件后，Worker 反解 sourcemap 时也需要读取该文件。测试和生产环境必须补充共享卷或改成共享对象存储。

### 3.6 容器内的 localhost 和宿主机 localhost

这是 Docker 初学者最容易踩坑的地方。

在宿主机上访问：

- `localhost:3000` 表示访问宿主机映射出来的 Server 端口。
- `localhost:5173` 表示访问宿主机映射出来的 Client 端口。
- `localhost:3306` 表示访问宿主机映射出来的 MySQL 端口。

在容器内部访问：

- `localhost` 表示当前容器自己。
- Server 容器访问 MySQL，应该使用 `mysql:3306`。
- Server 容器访问 Redis，应该使用 `redis:6379`。
- Worker 容器访问 MySQL，应该使用 `mysql:3306`。
- Worker 容器访问 Redis，应该使用 `redis:6379`。

这也是本项目 `docker-compose.yml` 中 Server 和 Worker 要覆盖环境变量的原因：

```yaml
DATABASE_URL: mysql://monitor:monitor_pass@mysql:3306/codex_monitor
REDIS_HOST: redis
```

## 4. Docker 的典型使用场景

### 4.1 推荐使用 Docker 的场景

| 场景 | 是否推荐 | 原因 |
| --- | --- | --- |
| 启动 MySQL、Redis、PostgreSQL 等基础服务 | 推荐 | 不污染本机环境，版本可控，删除方便 |
| 后端 API 服务部署 | 推荐 | 运行环境一致，方便发布和回滚 |
| Worker、定时任务、队列消费服务 | 推荐 | 适合独立扩容和重启 |
| 测试环境部署 | 推荐 | 可以快速复现接近生产的环境 |
| CI/CD 自动化构建 | 推荐 | 每次用相同镜像构建和测试 |
| 多人协作项目 | 推荐 | 降低环境差异 |
| 演示环境、验收环境 | 推荐 | 一条命令拉起完整系统 |

### 4.2 不一定推荐使用 Docker 的场景

| 场景 | 原因 |
| --- | --- |
| 频繁改前端页面并依赖热更新 | 本机运行 Vite 通常更快、更直观 |
| 需要复杂 IDE 断点调试 | 本机进程调试更方便 |
| 非常简单的脚本项目 | Docker 可能增加不必要复杂度 |
| 强依赖本机 GUI、USB、特殊硬件 | 容器访问这些资源需要额外配置 |
| 对磁盘 IO 极其敏感的本地开发 | Docker Desktop 在 Windows/macOS 上可能有性能损耗 |
| 生产数据库但没有备份、监控、权限、存储规划 | 容器能跑数据库，但不等于已经具备生产运维能力 |

## 5. 本项目的 Docker 结构

### 5.1 当前服务组成

本项目根目录的 `docker-compose.yml` 定义了 5 个服务：

| 服务名 | 容器名 | 作用 | 端口 |
| --- | --- | --- | --- |
| `mysql` | `codex-monitor-mysql` | 存储用户、项目、应用、事件、告警、sourcemap 记录 | `3306:3306` |
| `redis` | `codex-monitor-redis` | BullMQ 队列，用于事件异步消费 | `6379:6379` |
| `server` | `codex-monitor-server` | NestJS API 服务 | `3000:3000` |
| `worker` | `codex-monitor-worker` | BullMQ Worker，处理事件、聚合、告警、sourcemap 反解 | 无对外端口 |
| `client` | `codex-monitor-client` | React 控制台 | `5173:5173` |

### 5.2 当前 Dockerfile

| 文件 | 作用 |
| --- | --- |
| `docker/server.Dockerfile` | 构建 Server 镜像 |
| `docker/worker.Dockerfile` | 构建 Worker 镜像 |
| `docker/client.Dockerfile` | 构建 Client 镜像 |

### 5.3 当前 Compose 启动后的访问地址

| 服务 | 地址 |
| --- | --- |
| Client 控制台 | `http://localhost:5173` |
| Server API | `http://localhost:3000/api` |
| MySQL | `localhost:3306` |
| Redis | `localhost:6379` |

默认 seed 账号：

| 字段 | 值 |
| --- | --- |
| 邮箱 | `admin@example.com` |
| 密码 | `admin123456` |

生产环境不要保留默认账号和默认密钥。

## 6. 安装 Docker

### 6.1 Windows 本地开发环境

推荐安装 Docker Desktop。

基本步骤：

1. 安装 Docker Desktop。
2. 开启 WSL2 后端。
3. 确认 BIOS/UEFI 已开启虚拟化。
4. 启动 Docker Desktop，并等待 Docker Engine 运行成功。
5. 打开 PowerShell，执行：

```powershell
docker --version
docker compose version
```

如果能看到版本号，说明 Docker 基本可用。

### 6.2 Linux 测试或生产服务器

Linux 服务器通常安装 Docker Engine 和 Docker Compose Plugin。

安装完成后执行：

```bash
docker --version
docker compose version
```

能看到版本号即可。

## 7. Docker 常用命令

### 7.1 启动服务

```bash
docker compose up -d
```

说明：

- `up` 表示创建并启动服务。
- `-d` 表示后台运行。

### 7.2 构建并启动服务

```bash
docker compose up --build -d
```

代码或 Dockerfile 变更后，需要重新构建镜像。

### 7.3 查看容器状态

```bash
docker compose ps
```

### 7.4 查看日志

```bash
docker compose logs -f server
docker compose logs -f worker
docker compose logs -f client
docker compose logs -f mysql
docker compose logs -f redis
```

### 7.5 进入容器执行命令

```bash
docker compose exec server sh
```

或者直接执行某条命令：

```bash
docker compose exec server pnpm prisma:seed
```

### 7.6 重启服务

```bash
docker compose restart server
docker compose restart worker
docker compose restart client
```

### 7.7 停止服务

```bash
docker compose down
```

### 7.8 停止并删除数据卷

```bash
docker compose down -v
```

注意：`-v` 会删除数据卷。本项目中会删除 MySQL 数据。除非明确想清空数据库，否则不要随便执行。

## 8. 本项目本地开发如何使用 Docker

### 8.1 推荐方案：Docker 只启动 MySQL 和 Redis

这是日常开发最推荐的方式。

优点：

- MySQL、Redis 不需要安装到本机。
- Server、Worker、Client 在本机运行，代码热更新和调试更方便。
- 不需要每次改代码都重新构建 Docker 镜像。

#### 步骤 1：复制环境变量文件

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

macOS/Linux：

```bash
cp .env.example .env
```

#### 步骤 2：修改 `.env`

如果使用 Docker Compose 启动的 MySQL，建议把 `.env` 中数据库连接改成：

```env
DATABASE_URL=mysql://monitor:monitor_pass@localhost:3306/codex_monitor
REDIS_HOST=localhost
REDIS_PORT=6379
SERVER_PORT=3000
CLIENT_ORIGIN=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3000/api
```

说明：

- 本机 Node.js 进程访问 Docker 暴露出来的 MySQL，所以使用 `localhost:3306`。
- 本机 Node.js 进程访问 Docker 暴露出来的 Redis，所以使用 `localhost:6379`。
- 用户名和密码要与 `docker-compose.yml` 中 MySQL 配置一致。

#### 步骤 3：只启动 MySQL 和 Redis

```bash
docker compose up -d mysql redis
```

查看状态：

```bash
docker compose ps
```

#### 步骤 4：安装项目依赖

```bash
pnpm install
```

#### 步骤 5：生成 Prisma Client

```bash
pnpm db:generate
```

#### 步骤 6：初始化数据库

如果只是把项目已有迁移应用到数据库，推荐执行：

```bash
node scripts/run-with-env.mjs pnpm --filter @codex-monitor/server exec prisma migrate deploy --schema prisma/schema.prisma
```

然后写入默认 seed 数据：

```bash
pnpm db:seed
```

如果你正在开发数据库结构，并且需要生成新的 migration，可以使用：

```bash
pnpm db:migrate
```

注意：`pnpm db:migrate` 内部使用 `prisma migrate dev`，更适合开发环境。它可能需要数据库账号拥有创建 shadow database 的权限。如果权限不足，可以改用 root 账号，或者先用 `migrate deploy` 应用已有迁移。

#### 步骤 7：启动本地开发服务

```bash
pnpm dev
```

启动后访问：

```text
http://localhost:5173
```

默认登录：

```text
admin@example.com
admin123456
```

### 8.2 可选方案：完整 Docker Compose 启动

完整 Docker 启动适合首次体验、演示、验收、模拟部署。

#### 步骤 1：复制环境变量文件

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

macOS/Linux：

```bash
cp .env.example .env
```

#### 步骤 2：启动全部服务

```bash
docker compose up --build -d
```

#### 步骤 3：查看容器状态

```bash
docker compose ps
```

等待 `mysql` 和 `redis` 健康检查通过，`server`、`worker`、`client` 都处于运行状态。

#### 步骤 4：初始化数据库

推荐执行已有迁移：

```bash
docker compose exec server pnpm exec prisma migrate deploy --schema prisma/schema.prisma
```

写入默认 seed 数据：

```bash
docker compose exec server pnpm prisma:seed
```

如果只是本地开发，并且确实需要生成或调整 migration，也可以执行：

```bash
docker compose exec server pnpm prisma:migrate
```

生产环境不要使用 `prisma migrate dev`，应该使用 `prisma migrate deploy`。

#### 步骤 5：访问控制台

浏览器打开：

```text
http://localhost:5173
```

默认登录：

```text
admin@example.com
admin123456
```

#### 步骤 6：查看日志

```bash
docker compose logs -f server
docker compose logs -f worker
docker compose logs -f client
```

### 8.3 本地完整 Docker 启动的限制

当前 `docker-compose.yml` 没有把源代码目录挂载进容器，所以：

- 修改 `apps/server` 代码后，Server 容器不会自动更新。
- 修改 `apps/worker` 代码后，Worker 容器不会自动更新。
- 修改 `apps/client` 代码后，Client 容器不会自动更新。
- 通常需要重新执行 `docker compose up --build -d`。

因此，本地日常开发不建议完全依赖 Docker。

## 9. 测试环境 Docker 部署流程

测试环境目标是快速部署一个可验证的完整系统。可以先使用单机 Docker Compose。

### 9.1 测试环境推荐形态

| 组件 | 推荐方式 |
| --- | --- |
| MySQL | Compose 内置 MySQL 或测试库 |
| Redis | Compose 内置 Redis |
| Server | Docker 容器 |
| Worker | Docker 容器 |
| Client | Docker 容器，或构建静态文件后由 Nginx 托管 |

### 9.2 测试环境完整步骤

#### 步骤 1：准备服务器

在测试服务器安装：

- Docker
- Docker Compose Plugin
- Git

确认可用：

```bash
docker --version
docker compose version
git --version
```

#### 步骤 2：拉取代码

```bash
git clone <your-repo-url> codex-monitor
cd codex-monitor
```

如果代码已经存在：

```bash
cd codex-monitor
git pull
```

#### 步骤 3：创建环境变量文件

```bash
cp .env.example .env
```

至少修改：

```env
NODE_ENV=test
JWT_SECRET=替换成测试环境随机长字符串
SERVER_PORT=3000
CLIENT_ORIGIN=http://测试服务器IP:5173
VITE_API_BASE_URL=http://测试服务器IP:3000/api
```

如果测试环境直接使用 Compose 内置 MySQL 和 Redis，`server`、`worker` 的数据库和 Redis 地址会被 `docker-compose.yml` 中的环境变量覆盖为：

```env
DATABASE_URL=mysql://monitor:monitor_pass@mysql:3306/codex_monitor
REDIS_HOST=redis
```

#### 步骤 4：启动服务

```bash
docker compose up --build -d
```

#### 步骤 5：查看状态

```bash
docker compose ps
```

如果服务异常，查看日志：

```bash
docker compose logs -f mysql
docker compose logs -f redis
docker compose logs -f server
docker compose logs -f worker
docker compose logs -f client
```

#### 步骤 6：执行数据库迁移

```bash
docker compose exec server pnpm exec prisma migrate deploy --schema prisma/schema.prisma
```

#### 步骤 7：写入测试 seed 数据

```bash
docker compose exec server pnpm prisma:seed
```

#### 步骤 8：访问系统

浏览器访问：

```text
http://测试服务器IP:5173
```

默认账号：

```text
admin@example.com
admin123456
```

#### 步骤 9：验证核心链路

建议验证：

1. 控制台可以登录。
2. 项目和应用可以创建。
3. 应用允许域名包含测试业务页面域名。
4. SDK 可以上报事件到 `/api/collect`。
5. Worker 日志中没有持续报错。
6. 控制台能看到错误、性能、行为数据。
7. 告警规则能正常触发。
8. sourcemap 上传后，Worker 能读取到上传文件。

## 10. 生产环境 Docker 部署流程

生产环境重点不是“能不能启动”，而是安全、持久化、可回滚、可监控、可备份。

### 10.1 生产环境推荐形态

| 组件 | 推荐方式 |
| --- | --- |
| Server | Docker 镜像部署 |
| Worker | Docker 镜像部署，可水平扩容 |
| Client | 构建静态文件，用 Nginx、CDN 或对象存储托管 |
| MySQL | 托管 MySQL、云数据库或独立高可用 MySQL |
| Redis | 托管 Redis、独立 Redis 或 Redis 集群 |
| sourcemap 文件 | 共享卷、NFS、对象存储或独立文件服务 |
| HTTPS | Nginx、网关、负载均衡或云厂商证书服务 |

### 10.2 生产环境不建议直接照搬的点

当前项目 Docker 配置是 MVP 形态，能用于体验和测试，但生产环境建议优化：

| 当前配置 | 生产建议 |
| --- | --- |
| Client 容器使用 `pnpm dev --host 0.0.0.0` | 改成静态构建后由 Nginx/CDN 托管 |
| Dockerfile 是单阶段构建 | 改成多阶段构建，减少镜像体积 |
| `docker-compose.yml` 中 MySQL、Redis 直接暴露端口 | 生产环境不要无必要暴露数据库和 Redis 到公网 |
| sourcemap 上传文件没有共享卷 | Server 和 Worker 必须共享同一上传目录 |
| `.env.example` 中默认密钥 | 生产必须替换为强随机密钥 |
| 默认 seed 管理员 | 生产不要保留默认密码 |
| Server CORS 当前较宽松 | 生产建议限制到真实控制台和业务域名 |

### 10.3 单机生产 Compose 的参考结构

如果生产规模较小，可以先使用单机 Docker Compose，但要补充持久化和安全配置。

建议新增一个生产覆盖文件，例如 `docker-compose.prod.yml`：

```yaml
services:
  server:
    environment:
      NODE_ENV: production
      DATABASE_URL: mysql://monitor:monitor_pass@mysql:3306/codex_monitor
      REDIS_HOST: redis
      REDIS_PORT: 6379
      SERVER_PORT: 3000
    volumes:
      - sourcemap_uploads:/app/apps/server/uploads

  worker:
    environment:
      NODE_ENV: production
      DATABASE_URL: mysql://monitor:monitor_pass@mysql:3306/codex_monitor
      REDIS_HOST: redis
      REDIS_PORT: 6379
    volumes:
      - sourcemap_uploads:/app/apps/server/uploads

volumes:
  sourcemap_uploads:
```

说明：

- `server` 上传 sourcemap 时，当前代码会写入 `/app/apps/server/uploads`。
- `worker` 反解 sourcemap 时，会读取数据库中保存的绝对路径。
- 因此 `worker` 容器也必须把同一个卷挂载到 `/app/apps/server/uploads`。

如果生产环境继续使用 Compose 内置 MySQL、Redis，不建议把 MySQL 和 Redis 端口暴露到公网。更稳妥的做法是维护一份独立的生产 Compose 文件，去掉 `mysql`、`redis` 的 `ports` 配置，只让容器内部网络访问它们。

如果使用较新的 Docker Compose，也可以了解 `!reset` 覆盖语法来清空原始 `ports` 列表，但新手不建议一开始依赖这个细节。独立生产 Compose 文件更直观。

如果使用外部 MySQL 和 Redis，则可以不启动 Compose 内置的 `mysql`、`redis`，并把 Server、Worker 环境变量改成外部地址。

### 10.4 生产环境变量示例

当前根目录 `docker-compose.yml` 默认读取 `.env`。如果使用本文的单机 Compose 流程，建议在生产服务器上创建 `.env`，里面写生产环境配置，并确保不要提交到 Git。

如果团队更想使用 `.env.production` 命名，建议维护一份独立的生产 Compose 文件，避免和根 `docker-compose.yml` 中已有的 `env_file: .env` 产生合并理解成本。

示例：

```env
NODE_ENV=production

DATABASE_URL=mysql://monitor_prod:强密码@生产MySQL地址:3306/codex_monitor

REDIS_HOST=生产Redis地址
REDIS_PORT=6379

JWT_SECRET=必须替换成足够长的随机字符串

SERVER_PORT=3000
CLIENT_ORIGIN=https://monitor.example.com

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=alert@example.com
SMTP_PASS=邮件服务密码
SMTP_FROM=monitor@example.com

VITE_API_BASE_URL=https://monitor.example.com/api
```

注意：

- `JWT_SECRET` 不能使用示例值。
- 数据库密码、Redis 密码、SMTP 密码不要提交到仓库。
- 如果 Redis 需要密码，当前代码还需要补充 Redis 密码读取逻辑。
- `VITE_API_BASE_URL` 对 Vite 前端很重要。静态构建时，它通常会在构建阶段写入产物。

### 10.5 生产部署具体步骤：单机 Compose 版本

下面是一套相对清晰的单机流程。

#### 步骤 1：准备服务器

准备一台 Linux 服务器，并安装：

- Docker Engine
- Docker Compose Plugin
- Git
- Nginx，或使用云厂商负载均衡

验证：

```bash
docker --version
docker compose version
git --version
```

#### 步骤 2：获取代码

```bash
git clone <your-repo-url> codex-monitor
cd codex-monitor
```

#### 步骤 3：创建生产环境变量文件

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
vi .env
```

至少修改：

```env
NODE_ENV=production
JWT_SECRET=生产环境随机长字符串
CLIENT_ORIGIN=https://monitor.example.com
VITE_API_BASE_URL=https://monitor.example.com/api
```

如果使用外部 MySQL 和 Redis，也要修改：

```env
DATABASE_URL=mysql://用户:密码@数据库地址:3306/codex_monitor
REDIS_HOST=Redis地址
REDIS_PORT=6379
```

#### 步骤 4：创建生产覆盖 Compose 文件

创建 `docker-compose.prod.yml`，至少补充 sourcemap 共享卷。

参考：

```yaml
services:
  server:
    volumes:
      - sourcemap_uploads:/app/apps/server/uploads

  worker:
    volumes:
      - sourcemap_uploads:/app/apps/server/uploads

volumes:
  sourcemap_uploads:
```

如果生产环境继续使用 Compose 内置 MySQL、Redis，可以保留原来的 `mysql`、`redis` 服务。

如果使用外部 MySQL、Redis，可以在生产 Compose 中不启动内置 `mysql`、`redis`，或者维护一份单独的生产 Compose 文件。

#### 步骤 5：构建镜像

单机直接构建：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
```

更推荐的生产方式是在 CI/CD 中构建镜像，打版本标签并推送到镜像仓库：

```bash
docker build -f docker/server.Dockerfile -t registry.example.com/codex-monitor-server:版本号 .
docker build -f docker/worker.Dockerfile -t registry.example.com/codex-monitor-worker:版本号 .
docker build -f docker/client.Dockerfile -t registry.example.com/codex-monitor-client:版本号 .
docker push registry.example.com/codex-monitor-server:版本号
docker push registry.example.com/codex-monitor-worker:版本号
docker push registry.example.com/codex-monitor-client:版本号
```

然后生产服务器只负责拉取镜像和启动。

#### 步骤 6：启动数据库和 Redis

如果使用 Compose 内置 MySQL、Redis：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d mysql redis
```

查看状态：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

如果使用外部 MySQL、Redis，这一步改为确认外部服务可连接。

#### 步骤 7：执行数据库迁移

生产环境使用 `prisma migrate deploy`：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm server pnpm exec prisma migrate deploy --schema prisma/schema.prisma
```

不要在生产环境使用 `prisma migrate dev`。

#### 步骤 8：初始化管理员数据

如果是全新环境，可以临时执行 seed：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm server pnpm prisma:seed
```

注意：

- seed 会创建 `admin@example.com` 和 `admin123456`。
- 生产环境不要长期保留默认密码。
- 如果系统已有注册能力，生产更建议创建正式管理员账号，并避免继续使用默认账号。

#### 步骤 9：启动应用服务

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d server worker client
```

查看状态：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

查看日志：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f worker
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f client
```

#### 步骤 10：配置反向代理和 HTTPS

生产环境建议对外只暴露 HTTPS。

常见路由：

| 外部地址 | 转发目标 |
| --- | --- |
| `https://monitor.example.com/` | Client 静态页面 |
| `https://monitor.example.com/api/` | Server `http://127.0.0.1:3000/api/` |

如果当前仍使用 Client 容器：

```text
https://monitor.example.com/ -> http://127.0.0.1:5173/
https://monitor.example.com/api/ -> http://127.0.0.1:3000/api/
```

更推荐的方式是把 `apps/client` 构建成静态文件，再由 Nginx 托管。

#### 步骤 11：验证生产服务

验证项目是否可用：

1. 打开 `https://monitor.example.com`。
2. 登录控制台。
3. 创建项目和应用。
4. 确认应用允许域名包含真实业务域名。
5. 业务系统 SDK 上报到 `https://monitor.example.com/api/collect`。
6. 查看 Server 日志没有 4xx/5xx 异常增长。
7. 查看 Worker 日志没有消费失败。
8. 控制台可以看到事件数据。
9. 上传 sourcemap 后，Worker 可以反解错误堆栈。
10. 告警规则能发送邮件。

## 11. 发布和升级流程

### 11.1 测试环境升级

```bash
git pull
docker compose up --build -d
docker compose exec server pnpm exec prisma migrate deploy --schema prisma/schema.prisma
docker compose ps
```

### 11.2 生产环境升级

推荐流程：

1. 在 CI 执行测试和构建。
2. 构建 Server、Worker、Client 镜像。
3. 推送镜像到镜像仓库。
4. 生产服务器拉取新镜像。
5. 执行数据库迁移。
6. 滚动重启 Server。
7. 滚动重启 Worker。
8. 发布 Client 静态资源。
9. 验证核心链路。

单机 Compose 命令示例：

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm server pnpm exec prisma migrate deploy --schema prisma/schema.prisma
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d server worker client
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

### 11.3 回滚思路

生产环境建议所有镜像都使用明确版本号，不要只使用 `latest`。

例如：

```text
codex-monitor-server:2026-07-01-001
codex-monitor-worker:2026-07-01-001
codex-monitor-client:2026-07-01-001
```

如果新版本异常，可以把 Compose 中镜像标签改回上一版，然后执行：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d server worker client
```

数据库迁移一旦上线，回滚会更复杂。因此发布前要评估 migration 是否向后兼容。

## 12. 数据持久化和备份

### 12.1 必须持久化的数据

| 数据 | 原因 |
| --- | --- |
| MySQL 数据 | 所有业务数据和监控数据 |
| sourcemap 上传文件 | 错误堆栈反解依赖 |
| `.env` | 生产环境密钥和连接配置 |

### 12.2 MySQL 备份

如果使用 Compose 内置 MySQL，可以备份：

```bash
docker compose exec mysql mysqldump -uroot -proot_pass codex_monitor > codex_monitor.sql
```

恢复示例：

```bash
docker compose exec -T mysql mysql -uroot -proot_pass codex_monitor < codex_monitor.sql
```

注意：备份文件中可能包含业务数据和用户信息，需要妥善保存。

### 12.3 sourcemap 文件备份

如果使用 Docker volume：

```bash
docker volume ls
```

确认 sourcemap volume 后，应纳入服务器备份策略。

生产更推荐把 sourcemap 放到对象存储，数据库只保存对象存储路径。

## 13. 安全注意事项

### 13.1 不要暴露数据库和 Redis 到公网

生产环境中 MySQL 和 Redis 不应该对公网开放。

测试环境如果必须临时开放，也应该限制安全组来源 IP，并使用强密码。

### 13.2 替换默认密钥

`.env.example` 中的：

```env
JWT_SECRET=replace-with-a-long-random-secret
```

必须替换为生产环境随机长字符串。

### 13.3 不要提交真实环境变量

以下文件不要提交：

```text
.env
.env.production
.env.test
```

### 13.4 生产环境不要使用默认管理员密码

默认 seed 账号只适合本地体验和测试环境。

生产环境如果执行了 seed，需要尽快替换默认账号策略。

### 13.5 控制 SDK 上报来源域名

本项目应用配置中有 `allowedDomains`。业务系统接入 SDK 后，需要把真实业务域名加入允许域名。

如果没有配置正确，SDK 上报可能返回 403。

## 14. 常见问题

### 14.1 端口被占用

如果本机已经有 MySQL，占用了 3306，可以修改 `docker-compose.yml`：

```yaml
ports:
  - "3307:3306"
```

然后本机 `.env` 改成：

```env
DATABASE_URL=mysql://monitor:monitor_pass@localhost:3307/codex_monitor
```

Redis 同理，可以把 `6379:6379` 改成 `6380:6379`。

### 14.2 Server 连接不上 MySQL

先看 MySQL 是否健康：

```bash
docker compose ps
docker compose logs -f mysql
```

再确认连接地址是否正确：

- Server 在容器里运行时，MySQL 地址应该是 `mysql:3306`。
- Server 在本机运行时，MySQL 地址应该是 `localhost:3306`。

### 14.3 Prisma migrate 报 shadow database 权限错误

如果使用 `prisma migrate dev`，Prisma 可能需要创建 shadow database。

解决方式：

1. 本地开发时使用权限更高的数据库账号。
2. 只是应用已有迁移时，改用：

```bash
node scripts/run-with-env.mjs pnpm --filter @codex-monitor/server exec prisma migrate deploy --schema prisma/schema.prisma
```

容器内执行：

```bash
docker compose exec server pnpm exec prisma migrate deploy --schema prisma/schema.prisma
```

### 14.4 SDK 上报返回 403

常见原因是应用允许域名未配置当前业务域名。

处理：

1. 登录控制台。
2. 找到对应项目和应用。
3. 检查 `allowedDomains`。
4. 加入业务页面所在域名，例如 `example.com`。

本地测试通常需要：

```text
localhost
127.0.0.1
```

### 14.5 Client 页面能打开，但接口请求失败

检查 `VITE_API_BASE_URL`。

本地通常是：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

生产通常是：

```env
VITE_API_BASE_URL=https://monitor.example.com/api
```

如果前端已经构建成静态文件，修改环境变量后通常需要重新构建前端产物。

### 14.6 sourcemap 上传成功但反解失败

重点检查：

1. `release` 是否与 SDK 上报的 release 一致。
2. 上传的 `.map` 文件是否对应线上 bundle。
3. Worker 是否能访问 Server 上传文件保存的路径。
4. Docker 环境中 Server 和 Worker 是否挂载了同一个 sourcemap volume。

本项目当前代码会把 sourcemap 写到 Server 容器的：

```text
/app/apps/server/uploads
```

Worker 也必须能读取这个路径。

### 14.7 Docker 构建很慢

本项目当前没有 `.dockerignore` 文件时，Docker 构建上下文可能会包含本地 `node_modules` 等无关文件，导致构建上下文变大。

建议后续新增 `.dockerignore`，排除：

```text
node_modules
**/node_modules
dist
**/dist
.git
.env
.env.*
```

## 15. 本项目推荐实践总结

### 15.1 本地开发

推荐：

```bash
docker compose up -d mysql redis
pnpm install
pnpm db:generate
node scripts/run-with-env.mjs pnpm --filter @codex-monitor/server exec prisma migrate deploy --schema prisma/schema.prisma
pnpm db:seed
pnpm dev
```

不优先推荐完整 Docker 开发，因为当前 Compose 没有挂载源码，代码修改后不方便热更新。

### 15.2 测试环境

推荐：

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec server pnpm exec prisma migrate deploy --schema prisma/schema.prisma
docker compose exec server pnpm prisma:seed
```

测试环境可以使用默认 seed，但要清楚默认账号只是测试用途。

### 15.3 生产环境

推荐原则：

1. Server、Worker 使用 Docker 镜像部署。
2. Client 构建静态文件后交给 Nginx/CDN。
3. MySQL、Redis 使用托管服务或独立高可用服务。
4. 使用 `prisma migrate deploy` 执行数据库迁移。
5. sourcemap 上传目录必须持久化，并被 Server 和 Worker 共享。
6. 使用 HTTPS、强随机密钥、日志采集、备份和监控。
7. 镜像使用明确版本号，方便回滚。

## 16. 最小可执行命令清单

### 16.1 本地完整体验

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec server pnpm exec prisma migrate deploy --schema prisma/schema.prisma
docker compose exec server pnpm prisma:seed
docker compose ps
```

访问：

```text
http://localhost:5173
```

### 16.2 本地推荐开发

```bash
cp .env.example .env
docker compose up -d mysql redis
pnpm install
pnpm db:generate
node scripts/run-with-env.mjs pnpm --filter @codex-monitor/server exec prisma migrate deploy --schema prisma/schema.prisma
pnpm db:seed
pnpm dev
```

访问：

```text
http://localhost:5173
```

### 16.3 测试环境部署

```bash
git pull
cp .env.example .env
docker compose up --build -d
docker compose exec server pnpm exec prisma migrate deploy --schema prisma/schema.prisma
docker compose exec server pnpm prisma:seed
docker compose logs -f server
```

### 16.4 生产单机部署参考

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d mysql redis
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm server pnpm exec prisma migrate deploy --schema prisma/schema.prisma
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d server worker client
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

生产环境实际部署时，应结合镜像仓库、反向代理、HTTPS、数据库备份、日志监控和访问控制一起落地。
