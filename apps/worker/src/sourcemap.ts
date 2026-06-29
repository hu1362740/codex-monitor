import { readFile } from "node:fs/promises";
import { SourceMapConsumer } from "source-map";
import type { PrismaClient } from "@prisma/client";

const STACK_LINE_RE = /(?<file>https?:\/\/[^\s)]+|[^()\s]+\.js):(?<line>\d+):(?<column>\d+)/;

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
        const source = artifact.sourceRoot ? `${artifact.sourceRoot}/${original.source}` : original.source;
        return `${line} => ${source}:${original.line}:${original.column}`;
      })
      .join("\n");
  } finally {
    consumer.destroy();
  }
}
