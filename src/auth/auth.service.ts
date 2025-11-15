// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { getLiveSettings } from '../settings/settings.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const settings = await getLiveSettings(this.userService.getPrisma());
    // check login attempts
    const maxLoginAttempts = settings.security.maxLoginAttempts ?? 5;
    // lastFailedLogin is a Date, failedLoginAttempts is a count (fields must exist in DB, else mock with in-memory for demo)
    if (user.failedLoginAttempts && user.failedLoginAttempts >= maxLoginAttempts && user.lastFailedLogin && (new Date().getTime()-new Date(user.lastFailedLogin).getTime() < 30*60*1000)) {
      throw new ForbiddenException('Maximum login attempts exceeded. Please wait 30 minutes before trying again.');
    }
    const isPasswordValid = await this.userService.validatePassword(password, user.password);
    if (!isPasswordValid) {
      // increment failedLoginAttempts and update lastFailedLogin
      await this.userService.getPrisma().user.update({
        where: { email },
        data: {
          failedLoginAttempts: { increment: 1 },
          lastFailedLogin: new Date(),
        }});
      throw new UnauthorizedException('Invalid credentials');
    }
    // reset on success
    await this.userService.getPrisma().user.update({where: {email}, data:{failedLoginAttempts: 0}});
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
  login(user: { id: string; email: string; name: string; role: string }) {
    return (async () => {
      const prisma = this.userService['prisma'];
      const settings = await getLiveSettings(prisma);
      const sessionTimeout = settings.security.sessionTimeout ?? 30;
      const payload = { email: user.email, sub: user.id, role: user.role };
      return {
        access_token: this.jwtService.sign(payload, { expiresIn: `${sessionTimeout}m` }),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    })();
  }
}
