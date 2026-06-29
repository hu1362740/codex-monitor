FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
RUN pnpm install --filter @codex-monitor/server... --frozen-lockfile=false
COPY apps/server apps/server
WORKDIR /app/apps/server
RUN pnpm prisma:generate && pnpm build
EXPOSE 3000
CMD ["pnpm", "start:prod"]
