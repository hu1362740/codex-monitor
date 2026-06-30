// 由 @codex-monitor/sdk 产生，并经过 Server ingest 传递到队列的事件结构。
// 该接口需要与 packages/sdk/src/types.ts 以及 ingest DTO 保持一致。
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

// BullMQ job 的数据结构。Server 入队前已经把 appKey 解析为 applicationId，
// 因此 Worker 写入事件时不需要再次查询应用。
export interface BatchJob {
  applicationId: string;
  events: CollectedEvent[];
}
