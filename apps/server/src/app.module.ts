import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AlertsModule } from "./alerts/alerts.module";
import { AuthModule } from "./auth/auth.module";
import { CommonModule } from "./common/common.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { EventsModule } from "./events/events.module";
import { IngestModule } from "./ingest/ingest.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./projects/projects.module";
import { SourcemapsModule } from "./sourcemaps/sourcemaps.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    CommonModule,
    PrismaModule,
    AuthModule,
    ProjectsModule,
    IngestModule,
    EventsModule,
    DashboardModule,
    AlertsModule,
    SourcemapsModule
  ]
})
export class AppModule {}
