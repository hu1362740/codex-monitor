import axios from "axios";
import type { AlertRule, AuthResponse, BehaviorEvent, ErrorEvent, Overview, PerformanceEvent, Project } from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api",
  timeout: 15_000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("codex-monitor-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const monitorApi = {
  async login(email: string, password: string) {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
    localStorage.setItem("codex-monitor-token", data.accessToken);
    return data;
  },
  async register(input: { email: string; name: string; password: string }) {
    const { data } = await api.post<AuthResponse>("/auth/register", input);
    localStorage.setItem("codex-monitor-token", data.accessToken);
    return data;
  },
  async projects() {
    const { data } = await api.get<Project[]>("/projects");
    return data;
  },
  async createProject(input: { name: string; description?: string }) {
    const { data } = await api.post<Project>("/projects", input);
    return data;
  },
  async createApplication(input: { projectId: string; name: string; environment?: string; allowedDomains: string[] }) {
    const { data } = await api.post("/apps", input);
    return data;
  },
  async overview(applicationId: string) {
    const { data } = await api.get<Overview>("/dashboard/overview", { params: { applicationId } });
    return data;
  },
  async errors(applicationId: string) {
    const { data } = await api.get<ErrorEvent[]>("/events/errors", { params: { applicationId } });
    return data;
  },
  async performance(applicationId: string) {
    const { data } = await api.get<PerformanceEvent[]>("/events/performance", { params: { applicationId } });
    return data;
  },
  async behavior(applicationId: string) {
    const { data } = await api.get<BehaviorEvent[]>("/events/behavior", { params: { applicationId } });
    return data;
  },
  async alertRules(applicationId: string) {
    const { data } = await api.get<AlertRule[]>("/alerts/rules", { params: { applicationId } });
    return data;
  },
  async createAlertRule(input: Omit<AlertRule, "id" | "enabled" | "records"> & { applicationId: string }) {
    const { data } = await api.post<AlertRule>("/alerts/rules", input);
    return data;
  },
  async uploadSourcemap(input: { applicationId: string; release: string; sourceRoot?: string; file: File }) {
    const form = new FormData();
    form.set("applicationId", input.applicationId);
    form.set("release", input.release);
    if (input.sourceRoot) form.set("sourceRoot", input.sourceRoot);
    form.set("file", input.file);
    const { data } = await api.post("/sourcemaps/upload", form);
    return data;
  }
};
