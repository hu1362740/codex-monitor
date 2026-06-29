import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { evaluateAlerts } from "./alerts";
import { mapStack } from "./sourcemap";
import type { BatchJob, CollectedEvent } from "./types";

function fingerprint(event: CollectedEvent): string {
  return createHash("sha1").update([event.name, event.message, event.filename, event.lineno].join("|")).digest("hex");
}

function bucketMinute(date: Date): Date {
  const bucket = new Date(date);
  bucket.setSeconds(0, 0);
  return bucket;
}

function userId(event: CollectedEvent): string | undefined {
  const raw = event.user?.id;
  return typeof raw === "string" ? raw : undefined;
}

export async function processBatch(prisma: PrismaClient, job: BatchJob): Promise<void> {
  for (const event of job.events) {
    const occurredAt = new Date(event.timestamp);
    const raw = await prisma.eventRaw.create({
      data: {
        applicationId: job.applicationId,
        type: event.type,
        name: event.name,
        sessionId: event.sessionId,
        traceId: event.traceId,
        userId: userId(event),
        url: event.url,
        release: event.release,
        environment: event.environment,
        payload: event as unknown as Prisma.InputJsonValue,
        occurredAt
      }
    });

    if (event.type === "error") {
      const mappedStack = await mapStack(prisma, {
        applicationId: job.applicationId,
        release: event.release,
        stack: event.stack
      });
      await prisma.errorEvent.create({
        data: {
          applicationId: job.applicationId,
          rawEventId: raw.id,
          fingerprint: fingerprint(event),
          name: event.name,
          message: event.message ?? "",
          stack: event.stack,
          mappedStack,
          source: event.source,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          url: event.url,
          release: event.release,
          environment: event.environment,
          sessionId: event.sessionId,
          userId: userId(event),
          occurredAt
        }
      });
    }

    if (event.type === "performance") {
      await prisma.performanceEvent.create({
        data: {
          applicationId: job.applicationId,
          rawEventId: raw.id,
          name: event.name,
          value: event.value,
          duration: event.duration,
          status: event.status,
          url: event.url,
          metadata: event.metadata as Prisma.InputJsonValue,
          release: event.release,
          environment: event.environment,
          sessionId: event.sessionId,
          occurredAt
        }
      });
    }

    if (event.type === "behavior" || event.type === "custom") {
      await prisma.behaviorEvent.create({
        data: {
          applicationId: job.applicationId,
          rawEventId: raw.id,
          name: event.name,
          target: event.target,
          url: event.url,
          metadata: event.metadata as Prisma.InputJsonValue,
          release: event.release,
          environment: event.environment,
          sessionId: event.sessionId,
          userId: userId(event),
          occurredAt
        }
      });
    }

    await prisma.metricAggregate.upsert({
      where: {
        applicationId_bucket_metric: {
          applicationId: job.applicationId,
          bucket: bucketMinute(occurredAt),
          metric: `${event.type}:${event.name}`
        }
      },
      create: {
        applicationId: job.applicationId,
        bucket: bucketMinute(occurredAt),
        metric: `${event.type}:${event.name}`,
        value: 1
      },
      update: {
        value: { increment: 1 }
      }
    });
  }

  await evaluateAlerts(prisma, job.applicationId);
}
