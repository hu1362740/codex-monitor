import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

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

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("邮箱或密码错误");
    }
    return this.sign(user);
  }

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
