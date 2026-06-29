import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, JwtUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { EventsService } from "./events.service";

@Controller("events")
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get("errors")
  errors(@CurrentUser() user: JwtUser, @Query("applicationId") applicationId: string) {
    return this.events.errors(user.sub, applicationId);
  }

  @Get("performance")
  performance(@CurrentUser() user: JwtUser, @Query("applicationId") applicationId: string) {
    return this.events.performance(user.sub, applicationId);
  }

  @Get("behavior")
  behavior(@CurrentUser() user: JwtUser, @Query("applicationId") applicationId: string) {
    return this.events.behavior(user.sub, applicationId);
  }
}
