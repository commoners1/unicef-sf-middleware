// libs/core/utils/structured-logger.util.ts
import { Logger } from '@nestjs/common';

/**
 * Structured logging utility for consistent, queryable logs
 * Provides methods for structured logging with JSON output
 */
export class StructuredLogger {
  constructor(private readonly logger: Logger) {}

  /**
   * Log structured information at INFO level (periodic metrics, routine operations)
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.logger.log({
      message,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log structured warning (concerning conditions that aren't errors)
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn({
      message,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log structured error (actual failures)
   */
  error(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
  ): void {
    const errorContext: Record<string, unknown> = {
      message,
      ...context,
      timestamp: new Date().toISOString(),
    };

    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error !== undefined) {
      errorContext.error = error;
    }

    this.logger.error(errorContext);
  }

  /**
   * Log structured metrics (for periodic metric output)
   */
  metrics(metrics: Record<string, unknown>): void {
    this.logger.log({
      type: 'metrics',
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log job processing start
   */
  jobStart(jobId: string, context: Record<string, unknown>): void {
    this.logger.log({
      type: 'job_start',
      jobId,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log job processing completion
   */
  jobComplete(
    jobId: string,
    processingTime: number,
    context?: Record<string, unknown>,
  ): void {
    this.logger.log({
      type: 'job_complete',
      jobId,
      processingTime,
      status: 'success',
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log job processing failure
   */
  jobFailed(
    jobId: string,
    error: unknown,
    processingTime: number,
    context?: Record<string, unknown>,
  ): void {
    const errorContext: Record<string, unknown> = {
      type: 'job_failed',
      jobId,
      processingTime,
      status: 'failed',
      ...context,
      timestamp: new Date().toISOString(),
    };

    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else {
      errorContext.error = error;
    }

    this.logger.error(errorContext);
  }

  /**
   * Log batch operation
   */
  batch(
    operation: string,
    count: number,
    duration: number,
    context?: Record<string, unknown>,
  ): void {
    this.logger.log({
      type: 'batch_operation',
      operation,
      count,
      duration,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log performance alert (for concerning conditions)
   */
  alert(
    type: string,
    message: string,
    severity: 'WARNING' | 'CRITICAL',
    metrics?: Record<string, unknown>,
  ): void {
    const logData: Record<string, unknown> = {
      type: 'alert',
      alertType: type,
      message,
      severity,
      ...metrics,
      timestamp: new Date().toISOString(),
    };

    if (severity === 'CRITICAL') {
      this.logger.error(logData);
    } else {
      this.logger.warn(logData);
    }
  }

  /**
   * Log API call
   */
  apiCall(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    context?: Record<string, unknown>,
  ): void {
    this.logger.log({
      type: 'api_call',
      method,
      endpoint,
      statusCode,
      duration,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }
}
