export interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; name: string };
}

export interface Application {
  id: string;
  name: string;
  appKey: string;
  environment: string;
  allowedDomains: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  applications: Application[];
}

export interface Overview {
  pv: number;
  uv: number;
  errors: number;
  errorRate: number;
  apiFailureRate: number;
  vitals: Array<{ name: string; average: number }>;
  topErrors: Array<{ fingerprint: string; name: string; message: string; _count: { fingerprint?: number } | number }>;
}

export interface ErrorEvent {
  id: string;
  name: string;
  message: string;
  stack?: string;
  mappedStack?: string;
  url: string;
  release?: string;
  occurredAt: string;
}

export interface PerformanceEvent {
  id: string;
  name: string;
  value?: number;
  duration?: number;
  status?: number;
  url: string;
  occurredAt: string;
}

export interface BehaviorEvent {
  id: string;
  name: string;
  target?: string;
  url: string;
  occurredAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  durationMin: number;
  channel: string;
  target: string;
  enabled: boolean;
  records?: Array<{ id: string; value: number; message: string; notified: boolean; createdAt: string }>;
}
