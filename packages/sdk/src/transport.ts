import type { MonitorEvent, MonitorOptions, TransportEnvelope } from "./types";

export class Transport {
  private queue: MonitorEvent[] = [];
  private timer?: number;

  constructor(private readonly options: Required<Pick<MonitorOptions, "batchSize" | "flushInterval" | "maxRetries">> & MonitorOptions) {
    this.timer = window.setInterval(() => void this.flush(), this.options.flushInterval);
    window.addEventListener("pagehide", () => void this.flush(true));
    window.addEventListener("beforeunload", () => void this.flush(true));
  }

  enqueue(event: MonitorEvent): void {
    this.queue.push(event);
    if (this.queue.length >= this.options.batchSize) {
      void this.flush();
    }
  }

  async flush(useBeacon = false): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const events = this.queue.splice(0, this.options.batchSize);
    const envelope: TransportEnvelope = {
      appKey: this.options.appKey,
      events
    };

    const body = JSON.stringify(envelope);
    if (useBeacon && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(this.options.endpoint, new Blob([body], { type: "application/json" }));
      if (!ok) {
        this.queue.unshift(...events);
      }
      return;
    }

    for (let retry = 0; retry <= this.options.maxRetries; retry += 1) {
      try {
        const response = await fetch(this.options.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true
        });
        if (response.ok) {
          return;
        }
      } catch {
        // Retry below.
      }
      await new Promise((resolve) => window.setTimeout(resolve, 300 * (retry + 1)));
    }

    this.queue.unshift(...events);
  }

  destroy(): void {
    if (this.timer) {
      window.clearInterval(this.timer);
    }
    void this.flush(true);
  }
}
