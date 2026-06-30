import { readFile } from "node:fs/promises";
import { SourceMapConsumer } from "source-map";
import type { PrismaClient } from "@prisma/client";

const STACK_LINE_RE = /(?<file>https?:\/\/[^\s)]+|[^()\s]+\.js):(?<line>\d+):(?<column>\d+)/;

/**
 * 将生产 bundle 中的堆栈行列号映射回原始源码位置。
 *
 * 当前 MVP 匹配策略：
 * - 通过 applicationId + release 查找最新上传的 sourcemap
 * - 对包含 file:line:column 的堆栈行逐行反解
 * - 无法匹配的堆栈行保持原样
 */
export async function mapStack(
  prisma: PrismaClient,
  input: { applicationId: string; release?: string; stack?: string }
): Promise<string | undefined> {
  if (!input.stack || !input.release) {
    return undefined;
  }

  const artifact = await prisma.sourcemapArtifact.findFirst({
    where: { applicationId: input.applicationId, release: input.release },
    orderBy: { createdAt: "desc" }
  });
  if (!artifact) {
    return undefined;
  }

  const raw = await readFile(artifact.filePath, "utf8");
  const consumer = await new SourceMapConsumer(raw);
  try {
    return input.stack
      .split("\n")
      .map((line) => {
        const match = line.match(STACK_LINE_RE);
        if (!match?.groups) {
          return line;
        }
        const original = consumer.originalPositionFor({
          line: Number(match.groups.line),
          column: Number(match.groups.column)
        });
        if (!original.source || original.line == null || original.column == null) {
          return line;
        }
        // sourceRoot 是上传时配置的展示前缀，不参与 source-map 查找计算。
        const source = artifact.sourceRoot ? `${artifact.sourceRoot}/${original.source}` : original.source;
        return `${line} => ${source}:${original.line}:${original.column}`;
      })
      .join("\n");
  } finally {
    consumer.destroy();
  }
}
