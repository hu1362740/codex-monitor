import { MonitorCollector } from "./collector";
import type { MonitorOptions, MonitorUser } from "./types";

let collector: MonitorCollector | undefined;

export function initMonitor(options: MonitorOptions): MonitorCollector {
  if (!options.appKey) {
    throw new Error("Codex Monitor SDK requires appKey.");
  }
  if (!options.endpoint) {
    throw new Error("Codex Monitor SDK requires endpoint.");
  }

  collector?.destroy();
  collector = new MonitorCollector(options);
  collector.install();
  return collector;
}

export function setUser(user: MonitorUser): void {
  collector?.setUser(user);
}

export function track(name: string, metadata?: Record<string, unknown>): void {
  collector?.track(name, metadata);
}

export function captureException(error: unknown, metadata?: Record<string, unknown>): void {
  collector?.captureException(error, metadata);
}

export type { MonitorEvent, MonitorOptions, MonitorUser } from "./types";
