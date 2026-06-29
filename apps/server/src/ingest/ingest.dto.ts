import { Type } from "class-transformer";
import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

export class CollectEventDto {
  @IsIn(["error", "performance", "behavior", "custom"])
  type!: "error" | "performance" | "behavior" | "custom";

  @IsString()
  name!: string;

  @IsString()
  appKey!: string;

  @IsString()
  sessionId!: string;

  @IsString()
  traceId!: string;

  @IsString()
  url!: string;

  @IsString()
  userAgent!: string;

  @IsString()
  viewport!: string;

  @IsNumber()
  timestamp!: number;

  @IsString()
  environment!: string;

  @IsOptional()
  @IsString()
  release?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  stack?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsNumber()
  status?: number;

  @IsOptional()
  @IsObject()
  user?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CollectEnvelopeDto {
  @IsString()
  appKey!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectEventDto)
  events!: CollectEventDto[];
}
