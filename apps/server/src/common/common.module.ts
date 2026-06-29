import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard]
})
export class CommonModule {}
