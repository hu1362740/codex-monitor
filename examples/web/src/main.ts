import { captureException, initMonitor, track } from "@codex-monitor/sdk";

initMonitor({
  appKey: "demo-app-key",
  endpoint: "http://localhost:3000/api/collect",
  release: "1.0.0",
  environment: "production"
});

document.querySelector("#click")?.addEventListener("click", () => {
  track("demo_click", { location: "example" });
});

document.querySelector("#error")?.addEventListener("click", () => {
  try {
    throw new Error("示例页面手动错误");
  } catch (error) {
    captureException(error);
  }
});

document.querySelector("#fetch")?.addEventListener("click", () => {
  void fetch("http://localhost:3000/not-found");
});
