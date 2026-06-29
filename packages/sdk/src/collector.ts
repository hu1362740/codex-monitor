import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import { sanitizeEvent } from "./privacy";
import { Transport } from "./transport";
import type { MonitorEvent, MonitorOptions, MonitorUser } from "./types";
import { getTargetPath, getViewport, matchesPattern, now, uuid } from "./utils";

type AnyFunction = (...args: unknown[]) => unknown;

export class MonitorCollector {
  private readonly sessionId = uuid();
  private readonly transport: Transport;
  private readonly options: MonitorOptions & { batchSize: number; flushInterval: number; maxRetries: number; environment: string };
  private user?: MonitorUser;
  private originalFetch?: typeof window.fetch;
  private originalOpen?: typeof XMLHttpRequest.prototype.open;
  private originalSend?: typeof XMLHttpRequest.prototype.send;

  constructor(options: MonitorOptions) {
    this.options = {
      batchSize: 20,
      flushInterval: 5000,
      maxRetries: 2,
      environment: "production",
      sampleRate: 1,
      ...options
    };
    this.transport = new Transport(this.options);
  }

  install(): void {
    this.capturePageView();
    this.patchHistory();
    this.captureErrors();
    this.capturePerformance();
    this.captureClicks();
    this.patchFetch();
    this.patchXHR();
  }

  setUser(user: MonitorUser): void {
    this.user = user;
  }

  track(name: string, metadata?: Record<string, unknown>): void {
    void this.emit({
      type: "custom",
      name,
      metadata
    });
  }

  captureException(error: unknown, metadata?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : new Error(String(error));
    void this.emit({
      type: "error",
      name: err.name || "Error",
      message: err.message,
      stack: err.stack,
      source: "manual",
      metadata
    });
  }

  destroy(): void {
    this.transport.destroy();
  }

  private async emit(partial: Partial<MonitorEvent> & Pick<MonitorEvent, "type" | "name">): Promise<void> {
    if (Math.random() > (this.options.sampleRate ?? 1)) {
      return;
    }

    const url = window.location.href;
    if (matchesPattern(url, this.options.denyUrls) || (this.options.allowUrls?.length && !matchesPattern(url, this.options.allowUrls))) {
      return;
    }

    const event = sanitizeEvent(
      {
        appKey: this.options.appKey,
        release: this.options.release,
        environment: this.options.environment,
        sessionId: this.sessionId,
        traceId: uuid(),
        user: this.user,
        url,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        viewport: getViewport(),
        timestamp: now(),
        ...partial
      },
      this.options
    );

    const next = await this.options.beforeSend?.(event);
    if (next === false) {
      return;
    }
    this.transport.enqueue(next ?? event);
  }

  private capturePageView(): void {
    void this.emit({ type: "behavior", name: "page_view", metadata: { title: document.title } });
  }

  private patchHistory(): void {
    const wrap = (method: "pushState" | "replaceState") => {
      const original = history[method];
      history[method] = ((...args: Parameters<typeof history.pushState>) => {
        const result = original.apply(history, args);
        setTimeout(() => this.capturePageView(), 0);
        return result;
      }) as typeof history.pushState;
    };
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", () => this.capturePageView());
  }

  private captureErrors(): void {
    window.addEventListener(
      "error",
      (event) => {
        const target = event.target as HTMLElement | null;
        if (target && target !== window && "tagName" in target) {
          void this.emit({
            type: "error",
            name: "ResourceError",
            message: `${target.tagName} resource load failed`,
            source: "resource",
            filename: (target as HTMLScriptElement | HTMLImageElement).src || (target as HTMLLinkElement).href,
            target: getTargetPath(target)
          });
          return;
        }

        void this.emit({
          type: "error",
          name: event.error?.name ?? "RuntimeError",
          message: event.message,
          stack: event.error?.stack,
          source: "window.onerror",
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      },
      true
    );

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      void this.emit({
        type: "error",
        name: reason.name || "UnhandledRejection",
        message: reason.message,
        stack: reason.stack,
        source: "unhandledrejection"
      });
    });
  }

  private capturePerformance(): void {
    const report = (metric: { name: string; value: number; rating?: string }) => {
      void this.emit({
        type: "performance",
        name: metric.name,
        value: metric.value,
        metadata: { rating: metric.rating }
      });
    };

    onLCP(report);
    onCLS(report);
    onINP(report);
    onFCP(report);
    onTTFB(report);
  }

  private captureClicks(): void {
    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      void this.emit({
        type: "behavior",
        name: "click",
        target: getTargetPath(target),
        metadata: {
          text: target?.innerText?.slice(0, 80),
          tag: target?.tagName?.toLowerCase()
        }
      });
    });
  }

  private patchFetch(): void {
    if (!window.fetch) {
      return;
    }

    this.originalFetch = window.fetch.bind(window);
    window.fetch = (async (...args: Parameters<typeof fetch>) => {
      const started = performance.now();
      const input = args[0];
      const requestUrl = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      try {
        const response = await this.originalFetch!(...args);
        void this.emit({
          type: "performance",
          name: "http_request",
          duration: performance.now() - started,
          status: response.status,
          metadata: { method: args[1]?.method ?? "GET", requestUrl }
        });
        return response;
      } catch (error) {
        void this.emit({
          type: "error",
          name: "HttpRequestError",
          message: error instanceof Error ? error.message : String(error),
          duration: performance.now() - started,
          source: "fetch",
          metadata: { requestUrl }
        });
        throw error;
      }
    }) as typeof fetch;
  }

  private patchXHR(): void {
    this.originalOpen = XMLHttpRequest.prototype.open;
    this.originalSend = XMLHttpRequest.prototype.send;

    const collector = this;
    XMLHttpRequest.prototype.open = function patchedOpen(method: string, url: string | URL, ...rest: unknown[]) {
      (this as XMLHttpRequest & { __monitor?: Record<string, unknown> }).__monitor = { method, url: String(url) };
      return collector.originalOpen!.apply(this, [method, url, ...(rest as [boolean?, string?, string?])]);
    } as typeof XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.send = function patchedSend(...args: Parameters<typeof XMLHttpRequest.prototype.send>) {
      const started = performance.now();
      const xhr = this as XMLHttpRequest & { __monitor?: Record<string, unknown> };
      this.addEventListener("loadend", () => {
        void collector.emit({
          type: xhr.status >= 400 ? "error" : "performance",
          name: xhr.status >= 400 ? "HttpRequestError" : "http_request",
          status: xhr.status,
          duration: performance.now() - started,
          source: "xhr",
          metadata: xhr.__monitor
        });
      });
      return collector.originalSend!.apply(this, args);
    } as AnyFunction as typeof XMLHttpRequest.prototype.send;
  }
}
