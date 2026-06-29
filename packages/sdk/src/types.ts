export type MonitorEventType = "error" | "performance" | "behavior" | "custom";

export interface MonitorUser {
  id?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
}

export interface MonitorOptions {
  appKey: string;
  endpoint: string;
  release?: string;
  environment?: string;
  sampleRate?: number;
  batchSize?: number;
  flushInterval?: number;
  maxRetries?: number;
  allowUrls?: Array<string | RegExp>;
  denyUrls?: Array<string | RegExp>;
  maskFields?: string[];
  beforeSend?: (event: MonitorEvent) => MonitorEvent | false | Promise<MonitorEvent | false>;
}

export interface MonitorEvent {
  type: MonitorEventType;
  name: string;
  message?: string;
  appKey: string;
  release?: string;
  environment: string;
  sessionId: string;
  traceId: string;
  user?: MonitorUser;
  url: string;
  referrer?: string;
  userAgent: string;
  viewport: string;
  timestamp: number;
  duration?: number;
  status?: number;
  stack?: string;
  source?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  target?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface TransportEnvelope {
  appKey: string;
  events: MonitorEvent[];
}
