import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SourcemapsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(userId: string, input: { applicationId: string; release: string; sourceRoot?: string }, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("请上传 sourcemap 文件");
    }
    if (!input.release) {
      throw new BadRequestException("缺少 release");
    }

    const app = await this.prisma.application.findFirst({
      where: { id: input.applicationId, project: { ownerId: userId } }
    });
    if (!app) {
      throw new ForbiddenException("无权操作该应用");
    }

    const dir = join(process.cwd(), "uploads", "sourcemaps", input.applicationId, input.release);
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, file.originalname);
    await writeFile(filePath, file.buffer);

    return this.prisma.sourcemapArtifact.create({
      data: {
        applicationId: input.applicationId,
        release: input.release,
        sourceRoot: input.sourceRoot,
        fileName: file.originalname,
        filePath
      }
    });
  }
}
