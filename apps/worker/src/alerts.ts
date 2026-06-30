import type { AlertRule, PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

/**
 * @description 按告警规则配置的比较符判断当前指标值是否触发阈值。
 * @param operator AlertRule["operator"]，规则配置的比较符，支持 gt、gte、lt、lte。
 * @param value number，当前时间窗口内计算出的指标值。
 * @param threshold number，规则配置的触发阈值。
 * @returns boolean，返回 true 表示指标命中告警条件。
 */
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
      // 理论上枚举类型会限制到上面的四种值；兜底返回 false，避免未知配置误触发告警。
      return false;
  }
}

/**
 * @description 根据告警规则的通知渠道发送告警消息。
 * @param rule AlertRule，包含通知渠道、目标地址和规则 ID 等信息。
 * @param message string，已经拼装好的告警消息正文。
 * @returns Promise<boolean>，返回 true 表示通知发送成功，false 表示未发送或发送失败。
 * @throws 当 webhook 请求或邮件发送过程抛出异常时向上透出，由调用方记录失败。
 */
async function notify(rule: AlertRule, message: string): Promise<boolean> {
  // Webhook 目标保持通用，便于接入飞书、钉钉、企业微信或内部通知网关。
  if (rule.channel === "webhook") {
    const response = await fetch(rule.target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Codex Monitor 告警", message, ruleId: rule.id })
    });
    return response.ok;
  }

  // SMTP 未配置时不阻断事件入库，只把本次告警记录标记为未通知。
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

/**
 * @description 评估指定应用的所有启用告警规则，并在命中阈值时写入告警记录。
 * @param prisma PrismaClient，Worker 复用的数据库访问客户端。
 * @param applicationId string，需要评估告警规则的应用 ID。
 * @returns Promise<void>，规则评估和告警记录写入完成后结束。
 */
export async function evaluateAlerts(prisma: PrismaClient, applicationId: string): Promise<void> {
  const rules = await prisma.alertRule.findMany({ where: { applicationId, enabled: true } });
  if (rules.length === 0) {
    return;
  }

  const now = new Date();
  for (const rule of rules) {
    // durationMin 表示当前规则向前回看的时间窗口。
    const since = new Date(now.getTime() - rule.durationMin * 60_000);

    // 同一规则需要多个指标共同参与计算，并行查询可以减少 Worker 单批处理的等待时间。
    const [errorCount, pvCount, apiEvents, lcpEvents] = await Promise.all([
      prisma.errorEvent.count({ where: { applicationId, occurredAt: { gte: since } } }),
      prisma.behaviorEvent.count({ where: { applicationId, name: "page_view", occurredAt: { gte: since } } }),
      prisma.performanceEvent.findMany({ where: { applicationId, name: "http_request", occurredAt: { gte: since } } }),
      prisma.performanceEvent.findMany({ where: { applicationId, name: "LCP", occurredAt: { gte: since } } })
    ]);

    // 没有接口请求或 PV 时按 0 处理，避免除以 0 后产生 NaN 干扰阈值判断。
    const apiFailureRate = apiEvents.length
      ? apiEvents.filter((event) => (event.status ?? 0) >= 400).length / apiEvents.length
      : 0;
    const lcp = lcpEvents.length
      ? lcpEvents.reduce((sum, event) => sum + (event.value ?? 0), 0) / lcpEvents.length
      : 0;

    // AlertMetric 枚举值与这里的字段名保持一一对应，便于按规则动态选择指标。
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
      // 通知失败不能影响告警记录落库；保留未通知状态后可在控制台排查通知渠道。
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
