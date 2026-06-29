import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { CollectEnvelopeDto } from "./ingest.dto";

@Injectable()
export class IngestService {
  private readonly queue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService
  ) {
    const connection = new IORedis({
      host: config.get<string>("REDIS_HOST") ?? "localhost",
      port: config.get<number>("REDIS_PORT") ?? 6379,
      maxRetriesPerRequest: null
    });
    this.queue = new Queue("monitor-events", { connection });
  }

  async collect(dto: CollectEnvelopeDto, origin?: string) {
    if (dto.events.length === 0 || dto.events.length > 100) {
      throw new BadRequestException("单次上报事件数量必须在 1 到 100 之间");
    }
    if (dto.events.some((event) => event.appKey !== dto.appKey)) {
      throw new BadRequestException("事件 appKey 与信封 appKey 不一致");
    }

    const app = await this.prisma.application.findUnique({ where: { appKey: dto.appKey } });
    if (!app) {
      throw new NotFoundException("无效 appKey");
    }

    const allowedDomains = Array.isArray(app.allowedDomains) ? (app.allowedDomains as string[]) : [];
    if (origin && allowedDomains.length > 0) {
      let host = "";
      try {
        host = new URL(origin).hostname;
      } catch {
        throw new ForbiddenException("无效来源域名");
      }
      const allowed = allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
      if (!allowed) {
        throw new ForbiddenException("当前域名未被允许上报");
      }
    }

    await this.queue.add(
      "batch",
      {
        applicationId: app.id,
        events: dto.events
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 5000,
        removeOnFail: 5000
      }
    );

    return { accepted: dto.events.length };
  }
}
