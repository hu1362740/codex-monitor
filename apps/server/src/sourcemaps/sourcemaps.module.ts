import { Module } from "@nestjs/common";
import { SourcemapsController } from "./sourcemaps.controller";
import { SourcemapsService } from "./sourcemaps.service";

@Module({
  controllers: [SourcemapsController],
  providers: [SourcemapsService]
})
export class SourcemapsModule {}
