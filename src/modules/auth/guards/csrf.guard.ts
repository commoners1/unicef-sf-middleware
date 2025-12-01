import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Only protect state-changing methods
    const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!protectedMethods.includes(method)) {
      return true; // Allow GET, HEAD, OPTIONS without CSRF check
    }

    // Skip CSRF for certain endpoints (API key auth, public endpoints)
    const skipPaths = [
      '/auth/login',
      '/auth/register',
      '/health',
      '/healthz',
      '/v1/salesforce', // API key protected
    ];

    if (skipPaths.some((path) => request.path.startsWith(path))) {
      return true;
    }

    // Get CSRF token from cookie
    const cookieToken = request.cookies?.['csrf-token'];
    // Get CSRF token from header
    const headerToken = request.headers['x-csrf-token'] as string;

    // Both must be present and match
    if (!cookieToken || !headerToken) {
      throw new ForbiddenException(
        'CSRF token missing. Please include X-CSRF-Token header.',
      );
    }

    if (cookieToken !== headerToken) {
      throw new ForbiddenException('Invalid CSRF token.');
    }

    return true;
  }
}
