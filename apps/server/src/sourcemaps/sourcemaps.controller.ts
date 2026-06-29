import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser, JwtUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { SourcemapsService } from "./sourcemaps.service";

@Controller("sourcemaps")
@UseGuards(JwtAuthGuard)
export class SourcemapsController {
  constructor(private readonly sourcemaps: SourcemapsService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(
    @CurrentUser() user: JwtUser,
    @Body("applicationId") applicationId: string,
    @Body("release") release: string,
    @Body("sourceRoot") sourceRoot: string | undefined,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.sourcemaps.upload(user.sub, { applicationId, release, sourceRoot }, file);
  }
}
