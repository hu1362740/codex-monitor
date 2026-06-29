import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, JwtUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { CreateApplicationDto, CreateProjectDto } from "./projects.dto";
import { ProjectsService } from "./projects.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get("projects")
  list(@CurrentUser() user: JwtUser) {
    return this.projects.list(user.sub);
  }

  @Post("projects")
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateProjectDto) {
    return this.projects.create(user.sub, dto);
  }

  @Post("apps")
  createApplication(@CurrentUser() user: JwtUser, @Body() dto: CreateApplicationDto) {
    return this.projects.createApplication(user.sub, dto);
  }
}
