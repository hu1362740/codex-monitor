import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwner(userId: string, applicationId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, project: { ownerId: userId } }
    });
    if (!app) {
      throw new ForbiddenException("无权访问该应用");
    }
  }

  async errors(userId: string, applicationId: string) {
    await this.assertOwner(userId, applicationId);
    return this.prisma.errorEvent.findMany({
      where: { applicationId },
      orderBy: { occurredAt: "desc" },
      take: 100
    });
  }

  async performance(userId: string, applicationId: string) {
    await this.assertOwner(userId, applicationId);
    return this.prisma.performanceEvent.findMany({
      where: { applicationId },
      orderBy: { occurredAt: "desc" },
      take: 100
    });
  }

  async behavior(userId: string, applicationId: string) {
    await this.assertOwner(userId, applicationId);
    return this.prisma.behaviorEvent.findMany({
      where: { applicationId },
      orderBy: { occurredAt: "desc" },
      take: 100
    });
  }
}
