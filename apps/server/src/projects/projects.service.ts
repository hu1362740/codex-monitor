import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateApplicationDto, CreateProjectDto } from "./projects.dto";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.project.findMany({
      where: { ownerId: userId },
      include: { applications: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId: userId
      }
    });
  }

  async createApplication(userId: string, dto: CreateApplicationDto) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException("项目不存在");
    }
    if (project.ownerId !== userId) {
      throw new ForbiddenException("无权操作该项目");
    }

    const appKey = `app_${randomBytes(16).toString("hex")}`;
    const application = await this.prisma.application.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        appKey,
        environment: dto.environment ?? "production",
        allowedDomains: dto.allowedDomains
      }
    });

    await this.prisma.apiKey.create({
      data: {
        appKey,
        name: `${dto.name} SDK Key`
      }
    });

    return application;
  }
}
