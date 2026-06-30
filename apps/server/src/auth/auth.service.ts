import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./auth.dto";

@Injectable()
export class AuthService {
  /**
   * @description 注入用户持久化服务与 JWT 签发服务。
   * @param prisma PrismaService，用于读取和写入用户数据。
   * @param jwt JwtService，用于生成登录访问令牌。
   * @returns AuthService 实例。
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  /**
   * @description 注册新用户，并在注册成功后返回访问令牌和用户信息。
   * @param dto RegisterDto，包含邮箱、名称和明文密码。
   * @returns Promise<AuthResponse>，包含访问令牌和基础用户信息。
   * @throws ConflictException 当邮箱已被注册时抛出。
   */
  async register(dto: RegisterDto) {
    const existed = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existed) {
      throw new ConflictException("邮箱已注册");
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash: await hash(dto.password, 10)
      }
    });

    return this.sign(user);
  }

  /**
   * @description 校验用户邮箱和密码，并在通过后返回访问令牌和用户信息。
   * @param dto LoginDto，包含邮箱和明文密码。
   * @returns Promise<AuthResponse>，包含访问令牌和基础用户信息。
   * @throws UnauthorizedException 当邮箱不存在或密码不匹配时抛出。
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("邮箱或密码错误");
    }
    return this.sign(user);
  }

  /**
   * @description 根据用户信息签发 JWT，并返回前端所需的认证响应。
   * @param user { id: string; email: string; name: string }，已通过认证的用户基础信息。
   * @returns AuthResponse，包含访问令牌和基础用户信息。
   */
  private sign(user: { id: string; email: string; name: string }) {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, name: user.name });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  }
}
