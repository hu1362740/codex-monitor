import type { MonitorEvent, MonitorOptions } from "./types";

const DEFAULT_MASK_FIELDS = [
  "password",
  "token",
  "authorization",
  "cookie",
  "secret",
  "phone",
  "email",
  "idCard"
];

export function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl, window.location.origin);
    if (url.search) {
      url.search = "?__masked__=true";
    }
    return url.toString();
  } catch {
    return rawUrl.split("?")[0] ?? rawUrl;
  }
}

export function sanitizeValue(value: unknown, maskFields: string[] = DEFAULT_MASK_FIELDS): unknown {
  if (value == null) {
    return value;
  }
  if (typeof value === "string") {
    return value.length > 300 ? `${value.slice(0, 300)}...` : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, maskFields));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        const shouldMask = maskFields.some((field) => key.toLowerCase().includes(field.toLowerCase()));
        return [key, shouldMask ? "[masked]" : sanitizeValue(item, maskFields)];
      })
    );
  }
  return value;
}

export function sanitizeEvent(event: MonitorEvent, options: MonitorOptions): MonitorEvent {
  return {
    ...event,
    url: sanitizeUrl(event.url),
    referrer: event.referrer ? sanitizeUrl(event.referrer) : undefined,
    metadata: sanitizeValue(event.metadata, [...DEFAULT_MASK_FIELDS, ...(options.maskFields ?? [])]) as Record<string, unknown>
  };
}
