FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/worker/package.json apps/worker/package.json
RUN pnpm install --filter @codex-monitor/worker... --filter @codex-monitor/server... --frozen-lockfile=false
COPY apps/server apps/server
COPY apps/worker apps/worker
WORKDIR /app/apps/server
RUN pnpm prisma:generate
WORKDIR /app/apps/worker
RUN pnpm build
CMD ["pnpm", "start:prod"]
