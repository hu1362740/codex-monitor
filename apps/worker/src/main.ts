import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { processBatch } from "./processor";
import type { BatchJob } from "./types";

const prisma = new PrismaClient();

// BullMQ 和 ioredis 共用这个 Redis 连接。BullMQ Worker 要求
// maxRetriesPerRequest 为 null，否则长时间阻塞的队列命令可能被提前中断。
const connection = new IORedis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null
});

// Worker 入口：消费 apps/server/src/ingest 投递的事件批次。
// 每个 job 都包含一个 applicationId 和一组 SDK 事件。
const worker = new Worker<BatchJob>(
  "monitor-events",
  async (job) => {
    await processBatch(prisma, job.data);
  },
  { connection, concurrency: 5 }
);

worker.on("completed", (job) => {
  console.log(`processed monitor batch ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`monitor batch ${job?.id} failed`, error);
});

// 支持容器或进程管理器优雅停止，尽量避免中断正在处理的任务。
process.on("SIGTERM", async () => {
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
});
