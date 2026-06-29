import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateAlertRuleDto {
  @IsString()
  applicationId!: string;

  @IsString()
  name!: string;

  @IsIn(["error_count", "error_rate", "api_failure_rate", "lcp"])
  metric!: "error_count" | "error_rate" | "api_failure_rate" | "lcp";

  @IsIn(["gt", "gte", "lt", "lte"])
  operator!: "gt" | "gte" | "lt" | "lte";

  @IsNumber()
  threshold!: number;

  @IsOptional()
  @IsNumber()
  durationMin?: number;

  @IsIn(["webhook", "email"])
  channel!: "webhook" | "email";

  @IsString()
  target!: string;
}

export class UpdateAlertRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  threshold?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  target?: string;
}
