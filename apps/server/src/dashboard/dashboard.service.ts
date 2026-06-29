import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string, applicationId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, project: { ownerId: userId } }
    });
    if (!app) {
      throw new ForbiddenException("无权访问该应用");
    }

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const [pv, sessions, errors, performance, topErrors] = await Promise.all([
      this.prisma.behaviorEvent.count({ where: { applicationId, name: "page_view", occurredAt: { gte: since } } }),
      this.prisma.behaviorEvent.groupBy({ by: ["sessionId"], where: { applicationId, occurredAt: { gte: since } } }),
      this.prisma.errorEvent.count({ where: { applicationId, occurredAt: { gte: since } } }),
      this.prisma.performanceEvent.findMany({ where: { applicationId, occurredAt: { gte: since } }, take: 500 }),
      this.prisma.errorEvent.groupBy({
        by: ["fingerprint", "name", "message"],
        where: { applicationId, occurredAt: { gte: since } },
        _count: { fingerprint: true },
        orderBy: { _count: { fingerprint: "desc" } },
        take: 10
      })
    ]);

    const apiEvents = performance.filter((item) => item.name === "http_request");
    const failedApis = apiEvents.filter((item) => (item.status ?? 0) >= 400).length;
    const vitals = ["LCP", "CLS", "INP", "FCP", "TTFB"].map((name) => {
      const values = performance.filter((item) => item.name === name).map((item) => item.value ?? item.duration ?? 0);
      const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      return { name, average };
    });

    return {
      pv,
      uv: sessions.length,
      errors,
      errorRate: pv ? errors / pv : 0,
      apiFailureRate: apiEvents.length ? failedApis / apiEvents.length : 0,
      vitals,
      topErrors
    };
  }
}
