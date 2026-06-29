import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, JwtUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { CreateAlertRuleDto, UpdateAlertRuleDto } from "./alerts.dto";
import { AlertsService } from "./alerts.service";

@Controller("alerts")
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get("rules")
  list(@CurrentUser() user: JwtUser, @Query("applicationId") applicationId: string) {
    return this.alerts.list(user.sub, applicationId);
  }

  @Post("rules")
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateAlertRuleDto) {
    return this.alerts.create(user.sub, dto);
  }

  @Put("rules/:id")
  update(@CurrentUser() user: JwtUser, @Param("id") id: string, @Body() dto: UpdateAlertRuleDto) {
    return this.alerts.update(user.sub, id, dto);
  }

  @Delete("rules/:id")
  remove(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.alerts.remove(user.sub, id);
  }
}
