import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { JwtUser } from "./current-user.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwt: JwtService;

  constructor(config: ConfigService) {
    this.jwt = new JwtService({ secret: config.get<string>("JWT_SECRET") ?? "dev-secret" });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtUser }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) {
      throw new UnauthorizedException("缺少登录凭证");
    }

    try {
      request.user = await this.jwt.verifyAsync<JwtUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException("登录凭证无效或已过期");
    }
  }
}
