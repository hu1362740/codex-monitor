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

export interface BatchJob {
  applicationId: string;
  events: CollectedEvent[];
}
