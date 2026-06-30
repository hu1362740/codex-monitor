import { captureException, initMonitor, track, type MonitorEvent } from "@codex-monitor/sdk";

const collectEndpoint = "http://localhost:3000/api/collect";

/**
 * @description 判断事件是否由 SDK 上报请求自身产生，避免上报链路递归采集。
 * @param event MonitorEvent，SDK 即将发送的监控事件。
 * @returns boolean，返回 true 表示事件应被丢弃。
 */
function shouldDropSelfReportingEvent(event: MonitorEvent) {
  return event.metadata?.requestUrl === collectEndpoint;
}

/**
 * @description 在事件发送前过滤 SDK 上报请求自身产生的性能事件。
 * @param event MonitorEvent，SDK 即将发送的监控事件。
 * @returns MonitorEvent | false，返回 false 表示阻止发送，返回事件表示继续发送。
 */
function beforeSend(event: MonitorEvent) {
  if (shouldDropSelfReportingEvent(event)) {
    return false;
  }

  return event;
}

initMonitor({
  appKey: "demo-app-key",
  endpoint: collectEndpoint,
  release: "1.0.0",
  environment: "production",
  beforeSend
});

/**
 * @description 手动上报一个自定义点击事件，用于验证行为分析链路。
 * @returns void，无返回值。
 */
function handleDemoClick() {
  track("demo_click", { location: "example" });
}

/**
 * @description 手动捕获一个业务异常，用于验证错误监控链路。
 * @returns void，无返回值。
 */
function handleManualError() {
  try {
    throw new Error("示例页面手动错误");
  } catch (error) {
    captureException(error);
  }
}

/**
 * @description 触发一个不存在的接口请求，用于验证接口性能和失败请求采集链路。
 * @returns void，无返回值。
 */
function handleFetchError() {
  void fetch("http://localhost:3000/not-found");
}

document.querySelector("#click")?.addEventListener("click", handleDemoClick);
document.querySelector("#error")?.addEventListener("click", handleManualError);
document.querySelector("#fetch")?.addEventListener("click", handleFetchError);
