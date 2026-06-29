import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAlertRuleDto, UpdateAlertRuleDto } from "./alerts.dto";

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwner(userId: string, applicationId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, project: { ownerId: userId } }
    });
    if (!app) {
      throw new ForbiddenException("无权操作该应用");
    }
  }

  async list(userId: string, applicationId: string) {
    await this.assertOwner(userId, applicationId);
    return this.prisma.alertRule.findMany({
      where: { applicationId },
      include: { records: { orderBy: { createdAt: "desc" }, take: 10 } },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(userId: string, dto: CreateAlertRuleDto) {
    await this.assertOwner(userId, dto.applicationId);
    return this.prisma.alertRule.create({
      data: {
        ...dto,
        durationMin: dto.durationMin ?? 5
      }
    });
  }

  async update(userId: string, id: string, dto: UpdateAlertRuleDto) {
    const rule = await this.prisma.alertRule.findUnique({ where: { id } });
    if (!rule) {
      throw new ForbiddenException("告警规则不存在");
    }
    await this.assertOwner(userId, rule.applicationId);
    return this.prisma.alertRule.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const rule = await this.prisma.alertRule.findUnique({ where: { id } });
    if (!rule) {
      return { deleted: true };
    }
    await this.assertOwner(userId, rule.applicationId);
    await this.prisma.alertRule.delete({ where: { id } });
    return { deleted: true };
  }
}
