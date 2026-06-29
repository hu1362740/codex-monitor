import type { AlertRule, PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

function compare(operator: AlertRule["operator"], value: number, threshold: number): boolean {
  switch (operator) {
    case "gt":
      return value > threshold;
    case "gte":
      return value >= threshold;
    case "lt":
      return value < threshold;
    case "lte":
      return value <= threshold;
    default:
      return false;
  }
}

async function notify(rule: AlertRule, message: string): Promise<boolean> {
  if (rule.channel === "webhook") {
    const response = await fetch(rule.target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Codex Monitor 告警", message, ruleId: rule.id })
    });
    return response.ok;
  }

  if (!process.env.SMTP_HOST) {
    return false;
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      : undefined
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "monitor@example.com",
    to: rule.target,
    subject: "Codex Monitor 告警",
    text: message
  });
  return true;
}

export async function evaluateAlerts(prisma: PrismaClient, applicationId: string): Promise<void> {
  const rules = await prisma.alertRule.findMany({ where: { applicationId, enabled: true } });
  if (rules.length === 0) {
    return;
  }

  const now = new Date();
  for (const rule of rules) {
    const since = new Date(now.getTime() - rule.durationMin * 60_000);
    const [errorCount, pvCount, apiEvents, lcpEvents] = await Promise.all([
      prisma.errorEvent.count({ where: { applicationId, occurredAt: { gte: since } } }),
      prisma.behaviorEvent.count({ where: { applicationId, name: "page_view", occurredAt: { gte: since } } }),
      prisma.performanceEvent.findMany({ where: { applicationId, name: "http_request", occurredAt: { gte: since } } }),
      prisma.performanceEvent.findMany({ where: { applicationId, name: "LCP", occurredAt: { gte: since } } })
    ]);

    const apiFailureRate = apiEvents.length
      ? apiEvents.filter((event) => (event.status ?? 0) >= 400).length / apiEvents.length
      : 0;
    const lcp = lcpEvents.length
      ? lcpEvents.reduce((sum, event) => sum + (event.value ?? 0), 0) / lcpEvents.length
      : 0;

    const valueByMetric = {
      error_count: errorCount,
      error_rate: pvCount ? errorCount / pvCount : 0,
      api_failure_rate: apiFailureRate,
      lcp
    };
    const value = valueByMetric[rule.metric];

    if (!compare(rule.operator, value, rule.threshold)) {
      continue;
    }

    const message = `${rule.name}: ${rule.metric} 当前值 ${value}, 阈值 ${rule.operator} ${rule.threshold}`;
    let notified = false;
    try {
      notified = await notify(rule, message);
    } catch (error) {
      console.error("notify alert failed", error);
    }

    await prisma.alertRecord.create({
      data: {
        ruleId: rule.id,
        value,
        message,
        notified
      }
    });
  }
}
