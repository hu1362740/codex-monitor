FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/client/package.json apps/client/package.json
RUN pnpm install --filter @codex-monitor/client... --frozen-lockfile=false
COPY apps/client apps/client
WORKDIR /app/apps/client
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
