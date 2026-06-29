import { Body, Controller, Headers, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CollectEnvelopeDto } from "./ingest.dto";
import { IngestService } from "./ingest.service";

@Controller("collect")
@UseGuards(ThrottlerGuard)
export class IngestController {
  constructor(private readonly ingest: IngestService) {}

  @Post()
  collect(@Body() dto: CollectEnvelopeDto, @Headers("origin") origin?: string) {
    return this.ingest.collect(dto, origin);
  }
}
