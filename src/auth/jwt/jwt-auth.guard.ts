// src/auth/jwt/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenService } from '../services/token.service';
import { StructuredLogger } from '@core/utils/structured-logger.util';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly structuredLogger = new StructuredLogger(this.logger);

  constructor(private readonly tokenService: TokenService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request?.cookies?.auth_token || 
                  request.headers['authorization']?.replace('Bearer ', '');

    // SECURITY: Token blacklist check is REQUIRED per SECURITY_IMPROVEMENTS.md
    // This ensures immediate token invalidation on logout or security incidents
    if (token) {
      try {
        const isBlacklisted = await this.tokenService.isTokenBlacklisted(token);
        if (isBlacklisted) {
          // Extract token prefix outside logger call
          const tokenPrefix = token.substring(0, 20);
          this.structuredLogger.warn('Blacklisted token attempted access', {
            tokenPrefix,
            url: request.url,
            method: request.method,
            ipAddress: request.ip || request.socket.remoteAddress,
          });
          throw new UnauthorizedException('Token has been revoked');
        }
      } catch (error) {
        // If it's already an UnauthorizedException, re-throw it
        if (error instanceof UnauthorizedException) {
          throw error;
        }
        
        // If blacklist check fails due to technical error, fail securely
        // This prevents bypassing security if there's a database/service issue
        this.structuredLogger.error('Token blacklist check failed', error, {
          url: request.url,
          method: request.method,
          ipAddress: request.ip || request.socket.remoteAddress,
        });
        throw new UnauthorizedException('Token validation failed');
      }
    }

    // Call parent canActivate to continue with JWT validation
    return super.canActivate(context) as Promise<boolean>;
  }
}
