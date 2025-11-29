// src/errors/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorsService } from '../errors.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly errorsService: ErrorsService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorType = 'error';
    let stackTrace: string | undefined;

    // Extract error details
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const rawMessage =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any)?.message || exception.message || message;
      
      // Convert array messages to string (class-validator returns arrays)
      message = Array.isArray(rawMessage) 
        ? rawMessage.join('; ') 
        : rawMessage;
      
      errorType = status >= 500 ? 'critical' : status >= 400 ? 'error' : 'warning';
    } else if (exception instanceof Error) {
      message = exception.message || message;
      stackTrace = exception.stack;
      errorType = 'critical';
    }

    // Determine environment
    const environment =
      process.env.NODE_ENV === 'production'
        ? 'production'
        : process.env.NODE_ENV === 'staging'
          ? 'staging'
          : 'development';

    // Extract user ID from request if available
    const userId = (request as any).user?.id || null;

    // Log error to ErrorLog table (non-blocking)
    try {
      await this.errorsService.logError({
        message: message,
        type: errorType,
        source: 'http-exception-filter',
        environment: environment,
        stackTrace: stackTrace,
        ...(userId ? { user: { connect: { id: userId } } } : {}),
        userAgent: request.headers['user-agent'] || null,
        ipAddress: request.ip || request.socket.remoteAddress || null,
        url: request.url,
        method: request.method,
        statusCode: status,
        metadata: {
          path: request.path,
          query: request.query,
          body: this.sanitizeRequestBody(request.body),
          headers: this.sanitizeHeaders(request.headers),
        },
      });
    } catch (logError) {
      // Don't fail the request if error logging fails
      this.logger.error('Failed to log error to ErrorLog:', logError);
    }

    // Log to console with appropriate level
    // 401 Unauthorized errors are expected when checking authentication state
    // Log them at WARN level instead of ERROR to reduce noise
    if (status === HttpStatus.UNAUTHORIZED) {
      this.logger.warn(
        `HTTP ${status} Unauthorized: ${message}`,
        `${request.method} ${request.url}`,
      );
    } else if (status >= 500) {
      // Server errors (500+) are critical
      this.logger.error(
        `HTTP ${status} Error: ${message}`,
        stackTrace || exception,
        `${request.method} ${request.url}`,
      );
    } else {
      // Client errors (400-499) except 401 are logged as errors
      this.logger.error(
        `HTTP ${status} Error: ${message}`,
        `${request.method} ${request.url}`,
      );
    }

    // Send response
    response.status(status).json({
      statusCode: status,
      message: message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return null;
    const sanitized = { ...body };
    // Remove sensitive fields
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.token) sanitized.token = '[REDACTED]';
    if (sanitized.access_token) sanitized.access_token = '[REDACTED]';
    if (sanitized.authorization) sanitized.authorization = '[REDACTED]';
    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers) return null;
    const sanitized = { ...headers };
    // Remove sensitive headers
    if (sanitized.authorization) sanitized.authorization = '[REDACTED]';
    if (sanitized.cookie) sanitized.cookie = '[REDACTED]';
    return sanitized;
  }
}

