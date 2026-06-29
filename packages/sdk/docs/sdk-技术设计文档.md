# Codex Monitor SDK 技术设计文档

## 1. 项目定位

`@codex-monitor/sdk` 是运行在业务浏览器页面中的前端监控 SDK。它负责在不侵入业务逻辑的前提下采集前端错误、性能、接口、页面访问、点击和自定义事件，并将事件批量上报到 Codex Monitor Server。

## 2. 技术栈

- TypeScript
- web-vitals
- tsup
- Vitest

## 3. 目录结构

```text
packages/sdk
├─ package.json
├─ tsconfig.json
├─ tsup.config.ts
├─ scripts
│  └─ size-report.mjs
├─ src
│  ├─ index.ts
│  ├─ collector.ts
│  ├─ transport.ts
│  ├─ privacy.ts
│  ├─ types.ts
│  └─ utils.ts
├─ test
│  └─ privacy.test.ts
└─ docs
```

## 4. 公开 API

### initMonitor(options)

初始化 SDK，并安装所有采集器。

```ts
initMonitor({
  appKey: "app_xxx",
  endpoint: "https://monitor.example.com/api/collect",
  release: "1.0.0",
  environment: "production"
});
```

### setUser(user)

设置当前用户信息，后续事件会携带该 user。

```ts
setUser({ id: "u_1", name: "张三" });
```

### track(name, metadata)

上报自定义事件。

```ts
track("checkout_click", { sku: "sku_1" });
```

### captureException(error, metadata)

手动捕获异常。

```ts
captureException(new Error("业务异常"), { module: "order" });
```

## 5. 核心类型

### MonitorOptions

关键字段：

- `appKey`：应用上报 key。
- `endpoint`：上报地址。
- `release`：发布版本，用于 sourcemap 匹配。
- `environment`：环境。
- `sampleRate`：采样率。
- `batchSize`：批量上报大小。
- `flushInterval`：定时 flush 间隔。
- `maxRetries`：失败重试次数。
- `allowUrls`：允许采集的 URL。
- `denyUrls`：拒绝采集的 URL。
- `maskFields`：额外脱敏字段。
- `beforeSend`：上报前钩子。

### MonitorEvent

所有事件统一结构：

- `type`
- `name`
- `appKey`
- `release`
- `environment`
- `sessionId`
- `traceId`
- `url`
- `userAgent`
- `viewport`
- `timestamp`
- `metadata`

## 6. 采集器设计

### 错误采集

实现位置：`src/collector.ts`

采集内容：

- `window error`：JS 运行时异常。
- `unhandledrejection`：未捕获 Promise 异常。
- 资源加载错误：script、link、img 等资源加载失败。
- `captureException` 手动异常。

### 性能采集

采集内容：

- LCP
- CLS
- INP
- FCP
- TTFB

实现依赖：

```ts
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
```

### 接口采集

SDK patch：

- `window.fetch`
- `XMLHttpRequest.prototype.open`
- `XMLHttpRequest.prototype.send`

采集内容：

- 请求 URL。
- method。
- status。
- duration。
- 失败异常。

### 行为采集

采集内容：

- 页面 PV。
- `history.pushState` 和 `history.replaceState` 路由变化。
- `popstate`。
- document click。
- 自定义 `track`。

## 7. 隐私设计

文件：`src/privacy.ts`

默认脱敏字段：

- `password`
- `token`
- `authorization`
- `cookie`
- `secret`
- `phone`
- `email`
- `idCard`

URL 处理：

- query string 默认替换为 `?__masked__=true`。
- 不采集 Cookie。
- 不采集完整请求体。
- 不采集表单输入值。

业务可以通过 `maskFields` 扩展脱敏字段，通过 `beforeSend` 做最终过滤。

## 8. 上报设计

文件：`src/transport.ts`

策略：

- 事件进入内存队列。
- 达到 `batchSize` 时 flush。
- 达到 `flushInterval` 时 flush。
- 页面卸载时使用 `sendBeacon`。
- 不支持 sendBeacon 时降级为 fetch。
- fetch 失败后按 `maxRetries` 重试。

上报 envelope：

```json
{
  "appKey": "app_xxx",
  "events": []
}
```

## 9. 打包设计

文件：`tsup.config.ts`

输出：

- `dist/index.esm.js`
- `dist/index.cjs.js`
- `dist/monitor.iife.min.js`
- `dist/index.d.ts`

构建命令：

```bash
pnpm --filter @codex-monitor/sdk build
```

构建完成后执行 `scripts/size-report.mjs` 输出原始体积和 gzip 体积。

## 10. 测试

当前包含隐私脱敏测试：

```bash
pnpm --filter @codex-monitor/sdk test
```

建议后续补充：

- 初始化参数校验。
- Fetch patch。
- XHR patch。
- 错误捕获。
- sendBeacon fallback。
- beforeSend 丢弃事件。

## 11. 兼容性

目标环境：

- 现代 Chromium。
- Firefox。
- Safari。
- 支持 SPA 路由。

注意：

- 非浏览器环境不能初始化。
- 旧浏览器可能缺少 `crypto.randomUUID`，SDK 已提供降级 UUID。
- `sendBeacon` 不存在时会使用 fetch。

