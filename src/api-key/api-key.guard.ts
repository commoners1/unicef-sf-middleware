// src/api-key/api-key.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiKeyService } from './api-key.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    const apiKey = request.headers['x-api-key'] as string;
    const ipAddress = request.ip || 'unknown';
    const userAgent = request.headers['user-agent'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    // Extract environment from request
    const environment = this.extractEnvironmentFromRequest(request);

    // Validate API key with environment
    const validation = await this.apiKeyService.validateApiKey(
      apiKey,
      environment,
    );

    if (!validation.valid) {
      throw new UnauthorizedException(validation.reason);
    }

    // Attach user info to request
    request.user = validation.user!;
    request.apiKey = validation.apiKey!;

    // Store references for closure
    const auditService = this.auditService;

    // Log the request after response
    const originalSend = response.send.bind(response);
    response.send = (data: unknown) => {
      const duration = Date.now() - startTime;

      // Log asynchronously (don't block response)
      setImmediate(async () => {
        try {
          await auditService.logApiCall(
            validation.user!.id,
            validation.apiKey!.id,
            'api-call',
            request.url,
            request.method,
            request.route?.path || request.url,
            request.body as Record<string, unknown> | null,
            data as Record<string, unknown> | null,
            response.statusCode,
            ipAddress,
            userAgent,
            duration,
            null,
            null,
            null,
            null,
          );
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          console.error('Failed to log API call:', errorMessage);
        }
      });

      return originalSend(data);
    };

    return true;
  }

  private extractEnvironmentFromRequest(request: any): string {
    // Option 1: From header
    const envHeader = request.headers['x-environment'];
    if (
      envHeader &&
      ['development', 'staging', 'production'].includes(envHeader)
    ) {
      return envHeader;
    }

    // Option 2: From environment variable
    if (process.env.NODE_ENV === 'development') return 'development';
    if (process.env.NODE_ENV === 'staging') return 'staging';
    if (process.env.NODE_ENV === 'production') return 'production';

    // Option 3: From host / subdomain
    const host = request.headers.host;
    if (host?.includes('staging')) return 'staging';
    if (host?.includes('api')) return 'production';
    if (host?.includes('transferses.unicef.id')) return 'production';
    if (host?.includes('localhost') || host?.includes('127.0.0.1'))
      return 'development';

    // Default to production
    return 'production';
  }
}
