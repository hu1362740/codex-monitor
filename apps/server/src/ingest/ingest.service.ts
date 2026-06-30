import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, type ConnectionOptions } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { CollectEnvelopeDto } from "./ingest.dto";

@Injectable()
export class IngestService {
  private readonly queue: Queue;

  /**
   * @description 初始化事件入队服务，并根据环境变量创建 BullMQ 队列连接。
   * @param prisma PrismaService，用于校验应用配置。
   * @param config ConfigService，用于读取 Redis 连接配置。
   * @returns IngestService 实例。
   */
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService
  ) {
    const connection: ConnectionOptions = {
      host: config.get<string>("REDIS_HOST") ?? "localhost",
      port: Number(config.get<string>("REDIS_PORT") ?? 6379),
      maxRetriesPerRequest: null
    };
    this.queue = new Queue("monitor-events", { connection });
  }

  /**
   * @description 校验 SDK 上报信封，并将合法事件批量写入后台处理队列。
   * @param dto CollectEnvelopeDto，包含应用密钥与事件列表。
   * @param origin string | undefined，请求来源域名，用于应用域名白名单校验。
   * @returns Promise<{ accepted: number }>，返回已接受的事件数量。
   * @throws BadRequestException 当事件数量越界或事件 appKey 与信封不一致时抛出。
   * @throws NotFoundException 当 appKey 不存在时抛出。
   * @throws ForbiddenException 当来源域名无效或未在白名单内时抛出。
   */
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
