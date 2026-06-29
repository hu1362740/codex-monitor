import { IsArray, IsOptional, IsString } from "class-validator";

export class CreateProjectDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateApplicationDto {
  @IsString()
  projectId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  environment?: string;

  @IsArray()
  @IsString({ each: true })
  allowedDomains!: string[];
}
