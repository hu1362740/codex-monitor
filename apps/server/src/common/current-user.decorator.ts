import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface JwtUser {
  sub: string;
  email: string;
  name: string;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtUser => {
  const request = ctx.switchToHttp().getRequest<{ user: JwtUser }>();
  return request.user;
});
