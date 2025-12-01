// src/auth/jwt/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { UserService } from '@modules/user/services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    const secret = configService.getOrThrow<string>('JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract from httpOnly cookie (primary method)
        (request: Request & { cookies?: { auth_token?: string } }) => {
          return request?.cookies?.auth_token || null;
        },
        // Fallback to Authorization header for backward compatibility
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    name?: string;
    role?: string;
    type?: string;
  }) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // If name is missing from token (old tokens), fetch from database
    let name = payload.name;
    if (!name) {
      try {
        const user = await this.userService.findByEmail(payload.email);
        name = user?.name || '';
      } catch (error) {
        // If database fetch fails, use empty string as fallback
        name = '';
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: name,
      role: payload.role || 'USER',
    };
  }
}
