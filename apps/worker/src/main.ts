import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { processBatch } from "./processor";
import type { BatchJob } from "./types";

const prisma = new PrismaClient();
const connection = new IORedis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null
});

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

process.on("SIGTERM", async () => {
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
});
