import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, JwtUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("overview")
  overview(@CurrentUser() user: JwtUser, @Query("applicationId") applicationId: string) {
    return this.dashboard.overview(user.sub, applicationId);
  }
}
