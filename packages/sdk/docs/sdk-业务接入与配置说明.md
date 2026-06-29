# Codex Monitor SDK 业务接入与配置说明

## 1. 安装

```bash
pnpm add @codex-monitor/sdk
```

如果业务项目不使用 pnpm，也可以使用 npm 或 yarn：

```bash
npm install @codex-monitor/sdk
yarn add @codex-monitor/sdk
```

## 2. 基础接入

在业务应用入口文件初始化：

```ts
import { initMonitor } from "@codex-monitor/sdk";

initMonitor({
  appKey: "your-app-key",
  endpoint: "https://monitor.example.com/api/collect",
  release: "1.0.0",
  environment: "production"
});
```

建议初始化位置：

- React：`main.tsx` 或 `index.tsx`。
- Vue：`main.ts`。
- 原生页面：首屏脚本入口。

## 3. 完整配置示例

```ts
import { initMonitor } from "@codex-monitor/sdk";

initMonitor({
  appKey: "app_xxx",
  endpoint: "https://monitor.example.com/api/collect",
  release: "2026.06.29",
  environment: "production",
  sampleRate: 1,
  batchSize: 20,
  flushInterval: 5000,
  maxRetries: 2,
  allowUrls: ["example.com"],
  denyUrls: ["/health-check"],
  maskFields: ["mobile", "address"],
  beforeSend(event) {
    if (event.url.includes("/internal-debug")) {
      return false;
    }
    return event;
  }
});
```

## 4. 配置项说明

| 配置 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `appKey` | string | 是 | 无 | 控制台应用生成的上报 key |
| `endpoint` | string | 是 | 无 | Server 上报地址 |
| `release` | string | 否 | 无 | 当前发布版本 |
| `environment` | string | 否 | `production` | 环境 |
| `sampleRate` | number | 否 | `1` | 采样率，0 到 1 |
| `batchSize` | number | 否 | `20` | 批量上报条数 |
| `flushInterval` | number | 否 | `5000` | 定时上报间隔，毫秒 |
| `maxRetries` | number | 否 | `2` | 上报失败重试次数 |
| `allowUrls` | Array | 否 | 无 | 只采集匹配 URL |
| `denyUrls` | Array | 否 | 无 | 不采集匹配 URL |
| `maskFields` | string[] | 否 | 内置敏感字段 | 额外脱敏字段 |
| `beforeSend` | function | 否 | 无 | 上报前过滤或改写事件 |

## 5. 设置用户

登录后调用：

```ts
import { setUser } from "@codex-monitor/sdk";

setUser({
  id: "u_123",
  name: "张三",
  email: "zhangsan@example.com"
});
```

注意：

- email 默认属于敏感字段，metadata 中会脱敏。
- user 信息用于排障和影响面分析，请避免传入身份证、手机号等高敏信息。

## 6. 自定义事件

```ts
import { track } from "@codex-monitor/sdk";

track("pay_button_click", {
  productId: "sku_1",
  source: "home"
});
```

推荐命名：

- 使用英文小写。
- 使用业务动作命名。
- 例如 `login_submit`、`checkout_click`、`share_success`。

## 7. 手动错误捕获

```ts
import { captureException } from "@codex-monitor/sdk";

try {
  await submitOrder();
} catch (error) {
  captureException(error, {
    module: "order",
    action: "submit"
  });
}
```

## 8. SourceMap 配合

初始化时设置 release：

```ts
initMonitor({
  appKey: "app_xxx",
  endpoint: "https://monitor.example.com/api/collect",
  release: "1.0.0",
  environment: "production"
});
```

发布后上传对应 sourcemap：

```bash
node scripts/upload-sourcemap.mjs https://monitor.example.com/api <jwtToken> <applicationId> 1.0.0 ./dist/app.js.map webpack://src
```

要求：

- SDK release 与 sourcemap release 必须一致。
- 上传到正确 applicationId。
- stack 需要包含 line 和 column。

## 9. HTML script 接入

SDK 构建后会生成：

```text
dist/monitor.iife.min.js
```

页面中可使用：

```html
<script src="https://cdn.example.com/monitor.iife.min.js"></script>
<script>
  CodexMonitor.initMonitor({
    appKey: "app_xxx",
    endpoint: "https://monitor.example.com/api/collect",
    release: "1.0.0",
    environment: "production"
  });
</script>
```

## 10. 隐私建议

默认 SDK 已经做脱敏，但业务仍需注意：

- 不要在 `track` metadata 中传入密码、token、完整地址、身份证号。
- 不要将完整请求体放入自定义事件。
- 如果业务 URL query 中包含敏感信息，SDK 会默认替换 query。
- 如需额外脱敏字段，使用 `maskFields`。
- 如需完全拦截某些事件，使用 `beforeSend` 返回 `false`。

## 11. 验证接入是否成功

1. 打开浏览器 DevTools Network。
2. 查看是否出现 `/api/collect` 请求。
3. 确认响应为：

```json
{
  "accepted": 1
}
```

4. 登录控制台查看总览、错误、性能或行为数据。

## 12. 常见问题

### 上报 403

应用允许域名没有包含当前业务域名。到控制台应用配置中添加域名。

### 上报成功但控制台没数据

检查 Worker 是否启动。Server 只负责入队，真正入库由 Worker 完成。

### 采集事件过多

可以：

- 降低 `sampleRate`。
- 增加 `denyUrls`。
- 在 `beforeSend` 中过滤低价值事件。

### 业务接口被重复请求了吗

不会。SDK patch fetch/XHR 时只记录请求结果，不会主动再次发起业务请求。

### 会采集请求 body 吗

默认不会采集完整请求体。当前只记录 URL、method、status、duration 等元数据。

